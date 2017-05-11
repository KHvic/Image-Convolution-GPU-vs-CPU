
   var gpu = new GPU();

   function sqr(x) {
      return x*x;
   }

   function dist(x1,y1,x2,y2) {
      return Math.sqrt( sqr(x2-x1)+sqr(y2-y1) );
   }

   gpu.addFunction(sqr);
   gpu.addFunction(dist);

   function makeAnim(mode) {
      var opt = {
         dimensions: [800, 600, 4],
         debug: true,
         graphical: false,
         outputToTexture: true,
         mode: mode
      };

      var y = gpu.createKernel(function(img) {
            return img[this.thread.z][this.thread.y][this.thread.x];
      }, opt);
      return y;
   }

   function makefx4Anim(mode) {
    var opt = {
	dimensions: [250, 159, 4],
	debug: true,
	graphical: false,
	outputToTexture: true,
	mode: mode
    };

    var y = gpu.createKernel(function(img) {
            return img[this.thread.z][this.thread.y][this.thread.x];
	}, opt);
    return y;
    }

    var toimg = gpu.createKernel(function(A) {

    this.color(A[0][this.thread.y][this.thread.x],A[1][this.thread.y][this.thread.x],A[2][this.thread.y][this.thread.x]);
   }).dimensions([800, 600]).graphical(true);
/*
   var toimg = gpu.createKernel(function(A,value) {

    this.color(A[0][this.thread.y][this.thread.x]+value,A[1][this.thread.y][this.thread.x]+value,A[2][this.thread.y][this.thread.x]);
   }).dimensions([800, 600]).graphical(true);*/
/*
  function makeFilter(mode) {
      var opt = {
         dimensions: [800, 600, 4],
         debug: true,
         graphical: false,
         outputToTexture: true,
         mode: mode
      };
      var filt = gpu.createKernel(function(A) {
        if (this.thread.y > 0 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >0 && this.thread.z <3) {
            
             var c = A[this.thread.z][this.thread.y-1][this.thread.x-1]*-1 +
                     A[this.thread.z][this.thread.y][this.thread.x-1]*-2 +
                     A[this.thread.z][this.thread.y+1][this.thread.x-1]*-1 +
                     A[this.thread.z][this.thread.y-1][this.thread.x+1] +
                     A[this.thread.z][this.thread.y][this.thread.x+1]*2 +
                     A[this.thread.z][this.thread.y+1][this.thread.x+1];

             var d = A[this.thread.z][this.thread.y-1][this.thread.x-1]*-1 +
                     A[this.thread.z][this.thread.y-1][this.thread.x]*-2 +
                     A[this.thread.z][this.thread.y-1][this.thread.x+1]*-1 +
                     A[this.thread.z][this.thread.y+1][this.thread.x-1] +
                     A[this.thread.z][this.thread.y+1][this.thread.x]*2 +
                     A[this.thread.z][this.thread.y+1][this.thread.x+1];
                 return (c+d)+1 / 2;
          } else {
             return A[this.thread.z][this.thread.y][this.thread.x];
          }
   },opt);
      return filt;
   }
*/
//make animation function
function makeAnimator(mode) {
    var opt = {
	dimensions: [800, 600, 4],
	debug: true,
	graphical: false,
	outputToTexture: true,
	mode: mode
    };
    var filt = gpu.createKernel(function(A,x) {
	return A[this.thread.z][this.thread.y][(this.thread.x + x)];
	  },opt);
      return filt;
}


/*my codes*/
function makeSobelFilter(mode) {
      var opt = {
         dimensions: [800, 600, 4],
         debug: true,
         graphical: false,
         outputToTexture: true,
         mode: mode
      };
      var filt = gpu.createKernel(function(A) {
        if (this.thread.y > 0 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >0 && this.thread.z <3) {
            
             var c = A[this.thread.z][this.thread.y-1][this.thread.x-1]*-1 +
                     A[this.thread.z][this.thread.y][this.thread.x-1]*-2 +
                     A[this.thread.z][this.thread.y+1][this.thread.x-1]*-1 +
                     A[this.thread.z][this.thread.y-1][this.thread.x+1] +
                     A[this.thread.z][this.thread.y][this.thread.x+1]*2 +
                     A[this.thread.z][this.thread.y+1][this.thread.x+1];

             var d = A[this.thread.z][this.thread.y-1][this.thread.x-1]*-1 +
                     A[this.thread.z][this.thread.y-1][this.thread.x]*-2 +
                     A[this.thread.z][this.thread.y-1][this.thread.x+1]*-1 +
                     A[this.thread.z][this.thread.y+1][this.thread.x-1] +
                     A[this.thread.z][this.thread.y+1][this.thread.x]*2 +
                     A[this.thread.z][this.thread.y+1][this.thread.x+1];
                 return Math.sqrt(Math.pow(c,2)+Math.pow(d,2));
          } else {
             return A[this.thread.z][this.thread.y][this.thread.x];
          }
   },opt);
      return filt;
   }

   function makeBlurFilter(mode) {
      var opt = {
         dimensions: [800, 600, 4],
         debug: true,
         graphical: false,
         outputToTexture: true,
         mode: mode
      };
      var filt = gpu.createKernel(function(A) {
        if (this.thread.y > 0 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >0 && this.thread.z <3) {
            
             var c = A[this.thread.z][this.thread.y-1][this.thread.x-1]*0.0625 +
                     A[this.thread.z][this.thread.y][this.thread.x-1]*0.125 +
                     A[this.thread.z][this.thread.y+1][this.thread.x-1]*0.0625 +
                     A[this.thread.z][this.thread.y-1][this.thread.x+1]*0.0625 +
                     A[this.thread.z][this.thread.y][this.thread.x+1]*0.125 +
                     A[this.thread.z][this.thread.y+1][this.thread.x+1]*0.0625+
                     A[this.thread.z][this.thread.y-1][this.thread.x]*0.125+
                     A[this.thread.z][this.thread.y+1][this.thread.x]*0.125+
                     A[this.thread.z][this.thread.y][this.thread.x]*0.25;


                 return c;
          } else {
             return A[this.thread.z][this.thread.y][this.thread.x];
          }
   },opt);
      return filt;
   }

function makeBlurFilter2(mode) {
      var opt = {
         dimensions: [800, 600, 4],
         debug: true,
         graphical: false,
         outputToTexture: true,
         mode: mode
      };
      var filt = gpu.createKernel(function(A) {
        if (this.thread.y > 0 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >0 && this.thread.z <3) {
            
             var c = (A[this.thread.z][this.thread.y-1][this.thread.x-1] +
                     
                     A[this.thread.z][this.thread.y+1][this.thread.x-1] +
                     A[this.thread.z][this.thread.y-1][this.thread.x+1] +
                     A[this.thread.z][this.thread.y+1][this.thread.x+1])*0.0625+
                     (A[this.thread.z][this.thread.y][this.thread.x+1]+
                     A[this.thread.z][this.thread.y][this.thread.x-1]+
                     A[this.thread.z][this.thread.y-1][this.thread.x]+
                     A[this.thread.z][this.thread.y+1][this.thread.x])*0.125+
                     A[this.thread.z][this.thread.y][this.thread.x]*0.25;


                 return c;
          } else {
             return A[this.thread.z][this.thread.y][this.thread.x];
          }
   },opt);
      return filt;
   }

   function makeSharpFilter(mode) {
      var opt = {
         dimensions: [800, 600, 4],
         debug: true,
         graphical: false,
         outputToTexture: true,
         mode: mode
      };
      var filt = gpu.createKernel(function(A) {
        if (this.thread.y > 0 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >0 && this.thread.z <3) {
            
             var c = A[this.thread.z][this.thread.y-1][this.thread.x-1]*0 +
                     A[this.thread.z][this.thread.y-1][this.thread.x+1]*0 +
                     A[this.thread.z][this.thread.y+1][this.thread.x-1]*0 +
                     A[this.thread.z][this.thread.y+1][this.thread.x+1]*0 +

                     A[this.thread.z][this.thread.y][this.thread.x-1]*-1 +
                     A[this.thread.z][this.thread.y][this.thread.x+1]*-1 +
                     
                     A[this.thread.z][this.thread.y-1][this.thread.x]*-1 +
                     A[this.thread.z][this.thread.y+1][this.thread.x]*-1 +

                     A[this.thread.z][this.thread.y][this.thread.x]*5;


                 return c;
          } else {
             return A[this.thread.z][this.thread.y][this.thread.x];
          }
   },opt);
      return filt;
   }

   function makeEmbossFilter(mode) {
      var opt = {
         dimensions: [800, 600, 4],
         debug: true,
         graphical: false,
         outputToTexture: true,
         mode: mode
      };
      var filt = gpu.createKernel(function(A) {
        if (this.thread.y > 0 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >0 && this.thread.z <3) {
            
             var c = A[this.thread.z][this.thread.y-1][this.thread.x-1]*-2 +
                     A[this.thread.z][this.thread.y-1][this.thread.x+1]*0 +
                     A[this.thread.z][this.thread.y+1][this.thread.x-1]*0 +
                     A[this.thread.z][this.thread.y+1][this.thread.x+1]*2 +

                     A[this.thread.z][this.thread.y][this.thread.x-1]*-1 +
                     A[this.thread.z][this.thread.y][this.thread.x+1]*1 +
                     
                     A[this.thread.z][this.thread.y-1][this.thread.x]*1 +
                     A[this.thread.z][this.thread.y+1][this.thread.x]*-1 +

                     A[this.thread.z][this.thread.y][this.thread.x]*1;


                 return c;
          } else {
             return A[this.thread.z][this.thread.y][this.thread.x];
          }
   },opt);
      return filt;
   }

   function makeTVFilter(mode) {
      var opt = {
         dimensions: [800, 600, 4],
         debug: true,
         graphical: false,
         outputToTexture: true,
         mode: mode
      };
      var filt = gpu.createKernel(function(A,value) {
        
        if (this.thread.y > 0 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >0 && this.thread.z <3) {
                 return A[this.thread.z][this.thread.y][this.thread.x]*value;
          } else {
             return A[this.thread.z][this.thread.y][this.thread.x];
          }
   },opt);
      return filt;
   }