function makeGreeting(lang) {
    return function(fn, sn) {
        if (lang === 'en'){
            console.log(`Hello ${fn} ${sn}`);
        }else if (lang === 'es'){
            console.log(`Hola ${fn} ${sn}`);
        }
    }
}

var greetEng = makeGreeting('en');
var greetEs = makeGreeting('es');

greetEng('Adriana', 'Lima');
greetEs('Adriana', 'Lima');