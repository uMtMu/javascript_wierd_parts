var person = new Object();

person['firstname'] = 'Troy';
person['surname'] = 'Helen';

var firstNameProperty = 'firstname';

console.log(person);
console.log(person[firstNameProperty]);

console.log(person.firstname);

person.address = new Object();
person.address.street = '221b Baker St';
person.address.city= 'London';

