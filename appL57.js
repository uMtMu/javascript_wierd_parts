// function kontructor
function Person(firstname, lastname) {
    this.firstname = firstname || 'John';
    this.lastname = lastname || 'Doe';
}

var john = new Person();
console.log(john);

var jane = new Person('Jane', 'Doed');
console.log(jane);

Person.prototype.getFullName = () => this.firstname + ' ' + this.lastname


console.log(jane.getFullName());