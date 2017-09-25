/*

Minimal inheritance example

// Parent class constructor
function Parent() {
  this.a = 42;
}

// Parent class method
Parent.prototype.method = function method() {};

// Child class constructor
function Child() {
  Parent.call(this);
  this.b = 3.14159
}

// Inherit from the parent class
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;


*/

function Person(first, last, age, gender, interests) {
  this.name = {
    first,
    last
  };
  this.age = age;
  this.gender = gender;
  this.interests = interests;
};

Person.prototype.greeting = function() {
  alert('Hi! I\'m ' + this.name.first + '.');
};

function Teacher(first, last, age, gender, interests, subject) {
  Person.call(this, first, last, age, gender, interests);

  this.subject = subject;
}


Teacher.prototype = Object.create(Person.prototype);

Teacher.prototype.constructor = Teacher;


Teacher.prototype.greeting = function() {
  var prefix;

  if (this.gender === 'male' || this.gender === 'Male' || this.gender === 'm' || this.gender === 'M') {
    prefix = 'Mr.';
  } else if (this.gender === 'female' || this.gender === 'Female' || this.gender === 'f' || this.gender === 'F') {
    prefix = 'Mrs.';
  } else {
    prefix = 'Mx.';
  }

  alert('Hello. My name is ' + prefix + ' ' + this.name.last + ', and I teach ' + this.subject + '.');
};