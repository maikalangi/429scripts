const http = require('http');
const { randomUUID } = require('crypto');

const db = {
  customers: [
    {
      id: randomUUID(),
      name: 'Acme Heating & Air',
      email: 'owner@acmehvac.example',
      phone: '555-0100',
      address: '123 Elm Street'
    },
    {
      id: randomUUID(),
      name: 'Bright Cleaning',
      email: 'hello@brightcleaning.example',
      phone: '555-0200',
      address: '42 Oak Avenue'
    }
  ],
  technicians: [
    { id: randomUUID(), name: 'Jules Winnfield', skills: ['HVAC', 'Maintenance'] },
    { id: randomUUID(), name: 'Jackie Brown', skills: ['Cleaning', 'Organizing'] }
  ],
  quotes: [],
  jobs: [],
  invoices: []
};

function respond(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch (err) {
    return { _raw: Buffer.concat(chunks).toString() };
  }
}

function normalizeCustomer(payload = {}) {
  const { name, email = '', phone = '', address = '' } = payload;
  if (!name || typeof name !== 'string') {
    return { error: 'name is required' };
  }
  return { id: randomUUID(), name: name.trim(), email, phone, address };
}

function normalizeTechnician(payload = {}) {
  const { name, skills = [] } = payload;
  if (!name || typeof name !== 'string') {
    return { error: 'name is required' };
  }
  return { id: randomUUID(), name: name.trim(), skills: Array.isArray(skills) ? skills : [skills] };
}

function normalizeQuote(payload = {}) {
  const { customerId, items = [], notes = '' } = payload;
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) return { error: 'customerId not found' };
  const normalizedItems = Array.isArray(items)
    ? items.map((item, idx) => ({
        id: randomUUID(),
        description: item.description || `Line ${idx + 1}`,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0
      }))
    : [];
  const total = normalizedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return {
    id: randomUUID(),
    customerId,
    items: normalizedItems,
    notes,
    total,
    status: 'draft',
    createdAt: new Date().toISOString()
  };
}

function normalizeJob(payload = {}) {
  const { customerId, technicianId = null, title = 'Untitled Job', description = '', scheduledStart = null } = payload;
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) return { error: 'customerId not found' };
  const technician = technicianId ? db.technicians.find((t) => t.id === technicianId) : null;
  if (technicianId && !technician) return { error: 'technicianId not found' };
  return {
    id: randomUUID(),
    customerId,
    technicianId: technician ? technician.id : null,
    title,
    description,
    scheduledStart,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    logs: []
  };
}

function createInvoiceFromJob(job, sourceQuote = null) {
  const customer = db.customers.find((c) => c.id === job.customerId);
  const technician = job.technicianId ? db.technicians.find((t) => t.id === job.technicianId) : null;
  const lineItems = sourceQuote?.items || [
    { id: randomUUID(), description: job.title, quantity: 1, unitPrice: 0 }
  ];
  const total = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return {
    id: randomUUID(),
    jobId: job.id,
    customer,
    technician,
    lineItems,
    total,
    status: 'open',
    issuedAt: new Date().toISOString()
  };
}

async function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;

  if (req.method === 'GET' && pathname === '/health') {
    return respond(res, 200, { status: 'ok' });
  }

  if (req.method === 'GET' && pathname === '/api/customers') {
    return respond(res, 200, db.customers);
  }
  if (req.method === 'POST' && pathname === '/api/customers') {
    const customer = normalizeCustomer(await parseBody(req));
    if (customer.error) return respond(res, 400, customer);
    db.customers.push(customer);
    return respond(res, 201, customer);
  }

  if (req.method === 'GET' && pathname === '/api/technicians') {
    return respond(res, 200, db.technicians);
  }
  if (req.method === 'POST' && pathname === '/api/technicians') {
    const tech = normalizeTechnician(await parseBody(req));
    if (tech.error) return respond(res, 400, tech);
    db.technicians.push(tech);
    return respond(res, 201, tech);
  }

  if (req.method === 'GET' && pathname === '/api/quotes') {
    return respond(res, 200, db.quotes);
  }
  if (req.method === 'POST' && pathname === '/api/quotes') {
    const quote = normalizeQuote(await parseBody(req));
    if (quote.error) return respond(res, 400, quote);
    db.quotes.push(quote);
    return respond(res, 201, quote);
  }
  if (req.method === 'POST' && pathname.startsWith('/api/quotes/')) {
    const [, , , quoteId, action] = pathname.split('/');
    const quote = db.quotes.find((q) => q.id === quoteId);
    if (!quote) return respond(res, 404, { error: 'quote not found' });
    if (action === 'approve') {
      quote.status = 'approved';
      quote.approvedAt = new Date().toISOString();
      return respond(res, 200, quote);
    }
    if (action === 'convert') {
      quote.status = 'converted';
      const job = normalizeJob({ customerId: quote.customerId, title: 'Quoted Job', description: quote.notes });
      db.jobs.push(job);
      return respond(res, 201, { quote, job });
    }
  }

  if (req.method === 'GET' && pathname === '/api/jobs') {
    return respond(res, 200, db.jobs);
  }
  if (req.method === 'POST' && pathname === '/api/jobs') {
    const job = normalizeJob(await parseBody(req));
    if (job.error) return respond(res, 400, job);
    db.jobs.push(job);
    return respond(res, 201, job);
  }

  if (pathname.startsWith('/api/jobs/')) {
    const parts = pathname.split('/');
    const jobId = parts[3];
    const action = parts[4];
    const job = db.jobs.find((j) => j.id === jobId);
    if (!job) return respond(res, 404, { error: 'job not found' });

    if (req.method === 'GET' && parts.length === 4) {
      return respond(res, 200, job);
    }

    if (req.method === 'POST' && action === 'assign') {
      const { technicianId } = await parseBody(req);
      const tech = db.technicians.find((t) => t.id === technicianId);
      if (!tech) return respond(res, 400, { error: 'technicianId not found' });
      job.technicianId = technicianId;
      job.logs.push({ at: new Date().toISOString(), message: `Assigned to ${tech.name}` });
      return respond(res, 200, job);
    }

    if (req.method === 'POST' && action === 'complete') {
      const { resolutionNotes = '' } = await parseBody(req);
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.logs.push({ at: job.completedAt, message: resolutionNotes || 'Completed' });
      return respond(res, 200, job);
    }

    if (req.method === 'POST' && action === 'invoice') {
      const sourceQuote = db.quotes.find((q) => q.id === job.quoteId);
      const invoice = createInvoiceFromJob(job, sourceQuote);
      db.invoices.push(invoice);
      return respond(res, 201, invoice);
    }
  }

  if (req.method === 'GET' && pathname === '/api/invoices') {
    return respond(res, 200, db.invoices);
  }

  return respond(res, 404, { error: 'route not found' });
}

function createServer() {
  return http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error('Unhandled error', err);
      respond(res, 500, { error: 'internal error', detail: err.message });
    });
  });
}

module.exports = { createServer, db };

if (require.main === module) {
  const server = createServer();
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`FSM demo server listening on http://localhost:${port}`);
  });
}
