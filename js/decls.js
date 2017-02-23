
   function Enum(constantsList) {
      for (var i in constantsList) {
         this[constantsList[i]] = i;
      }
   }

   var ObjTyp = new Enum(['EMPTY', 'SPHERE', 'CUBOID', 'CYLINDER', 'CONE', 'TRIANGLE']);

   var fps = { startTime : 0, frameNumber : 0,
               getFPS : function() {
                  this.frameNumber++;
                  var d = new Date().getTime(), currentTime = ( d - this.startTime ) / 1000, result = Math.floor( ( (this.frameNumber*10) / currentTime ) );
                  if( currentTime > 1 ) {
                     this.startTime = new Date().getTime();
                     this.frameNumber = 0;
                  }
                  return result/10.0;
               }
             };

