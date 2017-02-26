//declare gpu
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

//make rendering function
function makeRender() {

  var img = gpu.createKernel(function(A) {
    this.color(A[0][this.thread.y][this.thread.x],A[1][this.thread.y][this.thread.x],A[2][this.thread.y][this.thread.x]);
  }).dimensions([800, 600]).graphical(true);
  return img;
}
var toimg1 = makeRender();

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


//3x3kernel sobel filter, perform 2d convolution twice, once for horizontal edge detection and another for vertical, before taking the square rooted squared sum.
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

//gaussian blur 5x5 kernel, will break the program for some reason if used on cpu mode.
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

      var c = A[this.thread.z][this.thread.y-2][this.thread.x-2]*1 +
      A[this.thread.z][this.thread.y-2][this.thread.x-1]*4+
      A[this.thread.z][this.thread.y-2][this.thread.x]*6+
      A[this.thread.z][this.thread.y-2][this.thread.x+1]*4+
      A[this.thread.z][this.thread.y-2][this.thread.x+2]*1+

      A[this.thread.z][this.thread.y-1][this.thread.x-2]*4 +
      A[this.thread.z][this.thread.y-1][this.thread.x-1]*16+
      A[this.thread.z][this.thread.y-1][this.thread.x]*24+
      A[this.thread.z][this.thread.y-1][this.thread.x+1]*16+
      A[this.thread.z][this.thread.y-1][this.thread.x+2]*4+

      A[this.thread.z][this.thread.y][this.thread.x-2]*6 +
      A[this.thread.z][this.thread.y][this.thread.x-1]*24+
      A[this.thread.z][this.thread.y][this.thread.x]*36+
      A[this.thread.z][this.thread.y][this.thread.x+1]*24+
      A[this.thread.z][this.thread.y][this.thread.x+2]*6+

      A[this.thread.z][this.thread.y+1][this.thread.x-2]*4 +
      A[this.thread.z][this.thread.y+1][this.thread.x-1]*16+
      A[this.thread.z][this.thread.y+1][this.thread.x]*24+
      A[this.thread.z][this.thread.y+1][this.thread.x+1]*16+
      A[this.thread.z][this.thread.y+1][this.thread.x+2]*4+

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

//optimized 5x5 gaussian blur, 1 d convolution twice
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

  //gaussian blur using 3x3 kernel convolution, 9 multiplication cost
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

  //optimized version of gaussian blur, 2 filter function, 1 dimension convolution performed twice using a 3x1 kernel and a 1x3 kernel, 6 multiplication cost
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


  //Laplacian Sharpening filter using 3x3 kernel convolution
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

  //Emboss filter using 3x3 kernel convolution
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


  //filter that make image 'blink' at randomly interval based on value input
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
