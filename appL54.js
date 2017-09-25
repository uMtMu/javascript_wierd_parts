var person = {
    firstname: 'Default',
    lastname: 'Default',
    getFullname: () => this.firstname + ' ' + this.lastname,
}

var john = {
    firstname: 'John',
    lastname: 'Doe'
}


//// don't do. this for demo !!!!
//john.__proto__ = person;
//console.log(john.getFullName());
//console.log(john.firstname);

// appL55.js

for (var prop in john) {
    // prototype inheritance ile almadığı özellikleri kontrol ediyor
    if (john.hasOwnProperty(prop)) {
        console.log(prop + ': ' + john[prop]);    
    }
}


var jane = {
    address: 'asşlfialfasdiş',
    getFormalFullname: () => this.lastname + ' ' + this.firstname
}

var jim = {
    getFirstName: () => this.firstname
}


// john'a diğer objelerin bütün özelliklerini ekler
_.extend(john, jane, jim);

console.log(john);