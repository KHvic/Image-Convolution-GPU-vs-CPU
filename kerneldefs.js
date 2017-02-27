//gpu variable and functions
var gpu = new GPU();
function sqr(x) {
  return x*x;
}
function dist(x1,y1,x2,y2) {
  return Math.sqrt( sqr(x2-x1)+sqr(y2-y1) );
}
gpu.addFunction(sqr);
gpu.addFunction(dist);

//make rendering function
function makeRender() {

  var img = gpu.createKernel(function(A) {
    this.color(A[0][this.thread.y][this.thread.x],A[1][this.thread.y][this.thread.x],A[2][this.thread.y][this.thread.x]);
  }).dimensions([800, 600]).graphical(true);
  return img;
}
var toimg1 = makeRender();

/*START OF MAKE FILTERING FUNCTIONS*/

//default function to return image as array
//
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

//make animation function, takes in a incremented position of x for each thread and return them
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


//3x3kernel sobel filter, perform 2d convolution twice, once for horizontal edge detection and another for vertical, before taking the square rooted squared sum.
/*
Convolution on input using 2 3x3 kernel each
x axis sobel kernel
[-1,0,1;
-2,0,2;
-1,0,1]

y axis sobel kernel
[1,2,1;
0,0,0;
-1,-2,-1]

lastly, to combine the vertical and horizontal convolution with:
squareroot((result1)^2 + (result2)^2)
*/
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

      //x axis sobel edge convolution
      var c = A[this.thread.z][this.thread.y-1][this.thread.x-1]*-1 +
      A[this.thread.z][this.thread.y][this.thread.x-1]*-2 +
      A[this.thread.z][this.thread.y+1][this.thread.x-1]*-1 +
      A[this.thread.z][this.thread.y-1][this.thread.x+1] +
      A[this.thread.z][this.thread.y][this.thread.x+1]*2 +
      A[this.thread.z][this.thread.y+1][this.thread.x+1];

      //y axis sobel edge convolution
      var d = A[this.thread.z][this.thread.y-1][this.thread.x-1]*-1 +
      A[this.thread.z][this.thread.y-1][this.thread.x]*-2 +
      A[this.thread.z][this.thread.y-1][this.thread.x+1]*-1 +
      A[this.thread.z][this.thread.y+1][this.thread.x-1] +
      A[this.thread.z][this.thread.y+1][this.thread.x]*2 +
      A[this.thread.z][this.thread.y+1][this.thread.x+1];
      
      //combining of the result
      return Math.sqrt(Math.pow(c,2)+Math.pow(d,2));
    } else {
      return A[this.thread.z][this.thread.y][this.thread.x];
    }
  },opt);
  return filt;
}

/*gaussian blur 5x5 kernel to filter image 
takes into account of more neighbouring thread to give higher level of feature than a 3x3 kernel
but has more multiplication operation per thread, 15 multiplication cost per pixel
[1,4,6,4,1;
4,16,24,16,4;
6,24,36,24,6;
4,16,24,16,4;
1,4,6,4,1] *(1/256)
*/
function makeBlurFilter5x5(mode) {
  var opt = {
    dimensions: [800, 600, 4],
    debug: true,
    graphical: false,
    outputToTexture: true,
    mode: mode
  };
  var filt = gpu.createKernel(function(A) {
    if (this.thread.y > 1 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >1 && this.thread.z <3) {

      //1st row
      var c = A[this.thread.z][this.thread.y-2][this.thread.x-2]*1 +
      A[this.thread.z][this.thread.y-2][this.thread.x-1]*4+
      A[this.thread.z][this.thread.y-2][this.thread.x]*6+
      A[this.thread.z][this.thread.y-2][this.thread.x+1]*4+
      A[this.thread.z][this.thread.y-2][this.thread.x+2]*1+

      //2nd row    
      A[this.thread.z][this.thread.y-1][this.thread.x-2]*4 +
      A[this.thread.z][this.thread.y-1][this.thread.x-1]*16+
      A[this.thread.z][this.thread.y-1][this.thread.x]*24+
      A[this.thread.z][this.thread.y-1][this.thread.x+1]*16+
      A[this.thread.z][this.thread.y-1][this.thread.x+2]*4+

      //3rd row
      A[this.thread.z][this.thread.y][this.thread.x-2]*6 +
      A[this.thread.z][this.thread.y][this.thread.x-1]*24+
      A[this.thread.z][this.thread.y][this.thread.x]*36+
      A[this.thread.z][this.thread.y][this.thread.x+1]*24+
      A[this.thread.z][this.thread.y][this.thread.x+2]*6+

      //4th row
      A[this.thread.z][this.thread.y+1][this.thread.x-2]*4 +
      A[this.thread.z][this.thread.y+1][this.thread.x-1]*16+
      A[this.thread.z][this.thread.y+1][this.thread.x]*24+
      A[this.thread.z][this.thread.y+1][this.thread.x+1]*16+
      A[this.thread.z][this.thread.y+1][this.thread.x+2]*4+

      //5th row    
      A[this.thread.z][this.thread.y+2][this.thread.x-2]*1 +
      A[this.thread.z][this.thread.y+2][this.thread.x-1]*4+
      A[this.thread.z][this.thread.y+2][this.thread.x]*6+
      A[this.thread.z][this.thread.y+2][this.thread.x+1]*4+
      A[this.thread.z][this.thread.y+2][this.thread.x+2]*1;

      return c/256;
    } else {
      return A[this.thread.z][this.thread.y][this.thread.x];
    }
  },opt);
  return filt;
}

//optimized 5x5 gaussian blur, not working as intended
function makeBlurFilter5x5Optimized(mode) {
  var opt = {
    dimensions: [800, 600, 4],
    debug: true,
    graphical: false,
    outputToTexture: true,
    mode: mode
  };
  var filt = gpu.createKernel(function(A,B) {
    if (this.thread.y > 1 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >1 && this.thread.z <3) {
      B[this.thread.z][this.thread.y][this.thread.x]= A[this.thread.z][this.thread.y+2][this.thread.x]*1+
      A[this.thread.z][this.thread.y+1][this.thread.x]*4+
      A[this.thread.z][this.thread.y][this.thread.x]*6+
      A[this.thread.z][this.thread.y-1][this.thread.x]*4+
      A[this.thread.z][this.thread.y-2][this.thread.x]*1;


      return (B[this.thread.z][this.thread.y][this.thread.x-2]*1
        +B[this.thread.z][this.thread.y][this.thread.x-1]*4
        +B[this.thread.z][this.thread.y][this.thread.x]*6
        +B[this.thread.z][this.thread.y][this.thread.x+1]*4
        +B[this.thread.z][this.thread.y][this.thread.x+2]*1)/256;
      } else {
        return A[this.thread.z][this.thread.y][this.thread.x];
      }
    },opt);
    return filt;
  }

  /*gaussian blur using 3x3 kernel convolution, total of 9 multiplication cost
  convolution on 3x3 kernel on input array to give a blurring effect
  [1/16,1/8,1/16;
  1/8,1/4,1/8;
  1/16,1/8,1/16]
  */
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

  /*attempt to optimize the 3x3 gaussian blur kernel, 6 multiplication cost in total
  optimized version of gaussian blur, using 2 kernel filter function, 
  1 dimension convolution performed twice using a 3x1 kernel and a 1x3 kernel, 6 multiplication cost
  
  1D vertical convolution with 3x1 kernel:
  [0.25;
  0.5;
  0.25]
*/
//first part, vertical convolution, 3 multiplication cost
  function makeBlurFilterOptimized(mode) {
    var opt = {
      dimensions: [800, 600, 4],
      debug: true,
      graphical: false,
      outputToTexture: true,
      mode: mode
    };
    var filt = gpu.createKernel(function(A) {

      if (this.thread.y > 0 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >0 && this.thread.z <3) {

        return A[this.thread.z][this.thread.y+1][this.thread.x]*0.25+
        A[this.thread.z][this.thread.y][this.thread.x]*0.5+
        A[this.thread.z][this.thread.y-1][this.thread.x]*0.25;
      } else {
        return A[this.thread.z][this.thread.y][this.thread.x];
      }
    },opt);
    return filt;
  }

/*second part, perform horizontal convolution with 1D on output of first part
1D horizontal convolution with 3x1 kernel:
[0.25 0.5 0.25;]
3 multiplication cost
*/
  function makeBlurFilterOptimized_2(mode) {
    var opt = {
      dimensions: [800, 600, 4],
      debug: true,
      graphical: false,
      outputToTexture: true,
      mode: mode
    };
    var filt = gpu.createKernel(function(B) {
      if (this.thread.y > 0 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >0 && this.thread.z <3) {

        return B[this.thread.z][this.thread.y][this.thread.x-1]*0.25+B[this.thread.z][this.thread.y][this.thread.x]*0.5+B[this.thread.z][this.thread.y][this.thread.x+1]*0.25;
      } else {
        return B[this.thread.z][this.thread.y][this.thread.x];
      }
    },opt);
    return filt;
  }


  /*Laplacian Sharpening filter using 3x3 kernel convolution:
  [0 -1 0;
  -1 5 -1;
  0 -1 0]
  gives a sharpening effect to image.
  */
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
        return  A[this.thread.z][this.thread.y][this.thread.x-1]*-1 +
        A[this.thread.z][this.thread.y][this.thread.x+1]*-1 +
        A[this.thread.z][this.thread.y-1][this.thread.x]*-1 +
        A[this.thread.z][this.thread.y+1][this.thread.x]*-1 +
        A[this.thread.z][this.thread.y][this.thread.x]*5;
      } else {
        return A[this.thread.z][this.thread.y][this.thread.x];
      }
    },opt);
    return filt;
  }

  /*Emboss filter using 3x3 kernel convolution:
  [-2 -1 0;
  -1 1 1;
  0 1 2]
  gives emboss effect
  */
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


  /*filter that make image 'blink' at random interval
   pass in Math.Random() added to each pixel
  */
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
        return A[this.thread.z][this.thread.y][this.thread.x]+value;
      } else {
        return A[this.thread.z][this.thread.y][this.thread.x];
      }
    },opt);
    return filt;
  }

  //grayscale filter implemented by 0.2989*R+0.587*G+0.114*B
  function makeGrayScalelFilter(mode) {
    var opt = {
      dimensions: [800, 600, 4],
      debug: true,
      graphical: false,
      outputToTexture: true,
      mode: mode
    };
    var filt = gpu.createKernel(function(A) {
      if (this.thread.y > 0 && this.thread.y < 600-2 && this.thread.x < 800-2 && this.thread.x >0 && this.thread.z <3) {
        return 0.2989 *A[0][this.thread.y][this.thread.x]+0.5870 *A[1][this.thread.y][this.thread.x]+0.1140 *A[2][this.thread.y][this.thread.x];
      } else {
        return A[this.thread.z][this.thread.y][this.thread.x];
      }
    },opt);
    return filt;
  }
