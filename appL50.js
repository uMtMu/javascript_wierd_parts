var person = {
    firstname: 'John',
    lastname: 'Doe',
    getFullName: function() {
        var fullname = this.firstname + '' + this.lastname;
        return fullname;
    }
}

/*
Uncaught TypeError: this.getFullName is not a function
    at logName (appL50.js:12)
    at appL50.js:18
*/
var logName = function(lang1, lang2) {
    console.log('Logged: ' + this.getFullName());
    
    console.log('Args: ' + lang1 + ' ' + lang2);
    console.log('++++++++++++');
}


// sadece bind edip çıktı olarak fonksiyon döndürür.
var logPersonName = logName.bind(person);

logPersonName('en');

// alttaki ikisi de fonksiyonu this değerini belirterek çalıştırır.
logName.call(person, 'en', 'es');
logName.apply(person, ['en', 'es']);


(function(lang1, lang2) {
    console.log('Logged: ' + this.getFullName());
    
    console.log('Args: ' + lang1 + ' ' + lang2);
    console.log('++++++++++++');
}).apply(person, ['en', 'es']);


// **** function borrowing ****

var person2 = {
    firstname: 'Jane',
    lastname: 'Doe'
}

// invoke this method to another object that does not have getFullName method
console.log(person.getFullName.apply(person2));


// **** function currying ****
function multiply(a, b) {
    return a * b;
}

// pythondaki partial
var multiplyByTwo = multiply.bind(this, 2);

console.log(multiplyByTwo(4));

var multiplyByThree = multiply.bind(this, 3);

console.log(multiplyByThree(5));