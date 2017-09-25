function a() {
    console.log(this);
    this.newvariable = 'hello';
}

var b = function() {
    console.log(this);   
}

a();

console.log(newvariable); // not good!

b();

var c = {
    name: 'The c object',
    log: function() {
        var self = this;
        
        self.name = 'Updated c object';
        console.log(self);
        
        
        // şit şit fak fak !!
        var setname = function(newname) {
            // alttaki satır global scope'a değişken ekliyor.
            // interpreter yazılırken böyle bir karar verilmiş.
            // this.name = newname; 
            // bunu atlatmak için
            // var self = this;
            // böylelikle self c objesine referans ediyor.
            self.name = newname;   
        }
        setname('Updated again! The c object');
        console.log(self);
    }
}

c.log();






