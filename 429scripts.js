
var cohort = {
    id: 'SEIR Flex',
    students: ['Mary', 'Toni', 'Fred'],
    instructors: ['Susan', 'Phil'],
    addStudent: function(name) {
      name = name[0].toUpperCase() + name.substr(1).toLowerCase();
      this.students.push(name);
    },
    pickRandomStudent: function() {
      var rndIdx = Math.floor(Math.random() * this.students.length);
      return this.students[rndIdx];
    }
  };


// class Vehicle {
//     // Code to define the class's properties and methods
//   }


// var v1 = new Vehicle();


class Vehicle {
    constructor(vin, make, model) {
      this.vin = vin;
      this.make = make;
      this.model = model;
      this.running = false;
      // return is not needed 
      // because the new object is returned by default
    }
    start(){
        this.running = true;
        console.log('running...');
    }
    stop(){
        this.running = false;
        console.log('stopped...');
    }
    toString() {
        return 'Vehicle (' + this.vin + ') is a ' +
        this.make + ' model ' + this.model;
    }
  }
  
var plane = new Vehicle('X123Y', 'Boeing');

var car = new Vehicle('A1234', 'Toyota', 'Camry');

var chillCar = new Vehicle ('verawang', 'Rolls Royce', 'Ghost');

chillCar.start();
chillCar.toString();