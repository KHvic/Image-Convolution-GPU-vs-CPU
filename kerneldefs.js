
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

   function processImage(imageData, height, width, weights){
     function repeat(n,v){//creates an array of n copies of v
       return Array.from({length:n},()=>v);//the trick is that {length:n} looks like an array, so Array.from will convert it to n x undefined, then we can map them to v.
     }
     function split(n,arr){
       var channels=[];
       for(var i=0;i<n;++i){//unfortunately we can not use repeat(n,[]) here as we want distinct arrays, not n references to the same []
         channels[i]=[];
       }
       arr.forEach((v,i)=>{
         channels[i%n].push(v);
       });
       return channels;
     }
     function complexAdd(a,b){//we will need to perform only two operations on complex numbers, + and *
       return {
         im:a.im+b.im,
         re:a.re+b.re,
       }
     }
     function complexMul(a,b){
       return {
         im:a.re*b.im+a.im*b.re,
         re:a.re*b.re-a.im*b.im,
       }
     }
     function flatten(a){
       return [].concat.apply([],a);
     }
     let outputData=repeat(height*width*3,0);
     const n=weights.length>>1;//the weights array is a square of odd width, and n is the "margin" we need to add to our picture
     //this is the most important trick which lets you use FFT to perform convolution: we represent the kernel as a polynomial
     //a polynomial is a 1D string of numbers, and the kernel is a 2D pattern of numbers
     //as the pixels of a 2D image can be thought of as a linear string of numbers where all rows of the image are simply concatenated
     //so too the kernel can be transformed into a 1D pattern, but to align the numbers correctly you have to pad each row with some zeros
     //so that each line of the kernel starts in the same column of the image where one is superimposed on top of the other.
     //We also have to reverse the polynomial coefficients because if you multiply two polynomials u and v, then uv[i] = sum over k of u[k]*v[i-k],
     //which is not helpful if what you want to compute looks more like sum over k of u[k]*v[i+k], in that we want the sum go in the same direction over two polynomials.
     //If you flip one of the polynomials then the multiplication of polynomials will do the heavy lifting for us, in that all the sums we want to compute will be located somewhere
     //among the coeffictients of the resulting polynomial - first few of them and some of the latest coefficients are just garbage, but the middle of it is what we need!
     const weightsPolynomial = flatten(weights.map((wv,i)=>i?repeat(width-1,0).concat(wv):wv)).reverse();
     const channelPolynomials = split(3,imageData).map((channel,channelIndex)=>{//we split the image into three separate color channels
       let polynomials=[];
       for(let imageRow=-n;imageRow<=height+n;++imageRow){//we add margins on top and on the bottom
         const sourceRow=Math.min(height-1,Math.max(0,imageRow));//we fill the margins with copies of borderline pixels (we could also fill them with black, or wrap)
         const rowData = channel.slice(sourceRow*width,(sourceRow+1)*width);//who knew that the second argument is not the length, but the end?!
         polynomials.push(repeat(n,rowData[0]));//I have this habbit of putting everything in an array and flattening everything later instead of using concat (this should keep time linear)
         polynomials.push(rowData);
         polynomials.push(repeat(n,rowData[width-1]));
       }
       return flatten(polynomials);
     });
     //after we multiply the channelPolynomial with weightsPolynomial we will get a polynomial with a degree which must be rounded up to nearest power of 2, to make FFT fast
     const outputDegree = 1<<Math.ceil(Math.log2(weightsPolynomial.length + channelPolynomials[0].length - 1 ));
     //we need a complex number ROOT, such that ROOT^outputDegree=1. Its easiest to find it using trigonometry:
     const angle = 2*Math.PI/outputDegree;
     const ROOT = {im: Math.sin(angle), re: Math.cos(angle) };
     function evaluate(p,r,k){//not very creative name for the function. It evaluates polynomial p in k points: r^0...,r^(k-1)
       if(p.length==0){
         return repeat(k,{re:0,im:0});
       }
       if(p.length==1){
         return repeat(k,p[0]);
       }
       const r2 = complexMul(r,r);
       const t = split(2,p).map(ps => evaluate(ps,r2,k/2));//split the polynomial into even-odd, and eval it for (r^2)^0,...,(r^2)^(k/2-1)
       let v=Array(k);//values to be computed
       let r_to_i={im:0,re:1};//r^i
       for(let i=0;i<k/2;++i){
         const tmp=complexMul(r_to_i,t[1][i]);
         v[i] = complexAdd(t[0][i],tmp);//this is quite obvious equation
         v[i+k/2] = complexAdd(t[0][i],{im:-tmp.im,re:-tmp.re});//this becomes obvious when you notice that r^(k/2) is -1
         r_to_i=complexMul(r,r_to_i);
       }
       return v;
     }
     function transform(polynomial){//treat an array of numbers as a polynomial with complex coefficients and evaluate it in outputDegree points
       return evaluate(polynomial.map(r => ({im:0,re:r})),ROOT,outputDegree);
     }
     function untransform(values){//I don't really understand this part of FFT^-1... I just trust Cormen here.
       return evaluate(values,{im:-ROOT.im,re:ROOT.re},outputDegree).map(c => c.re/(outputDegree));
     }
     function multiplyTransformed(ut,vt){//to multiply polynomials you simply multiply their values in all points
       return untransform(ut.map((uti,i)=>complexMul(uti,vt[i])));
     }

     const transformedWeightsPolynomial = transform(weightsPolynomial);

     channelPolynomials.forEach((channelPolynomial,channelIndex)=>{
       const multiplied = multiplyTransformed(transform(channelPolynomial),transformedWeightsPolynomial);
       multiplied.forEach((value,index)=>{
         const mid_index = index - (weightsPolynomial.length>>1);//we locate the pixel for which this coefficient is the result
         const y = Math.floor(mid_index / (2*n+width)) - n;//remember about margins
         const x = (mid_index % (2*n+width)) - n;
         if(0<=y && y < height && 0<=x && x < width){
           outputData[(y*width+x)*3+channelIndex]+=value;
         }
       })
     });
     return outputData.map(x=> Math.min(255,Math.max(0,Math.round(x))));//clamp
   }
/*
    var toimg = gpu.createKernel(function(A) {

    this.color(A[0][this.thread.y][this.thread.x],A[1][this.thread.y][this.thread.x],A[2][this.thread.y][this.thread.x]);
   }).dimensions([800, 600]).graphical(true);
*/



   function makeRender() {

       var img = gpu.createKernel(function(A) {
        this.color(A[0][this.thread.y][this.thread.x],A[1][this.thread.y][this.thread.x],A[2][this.thread.y][this.thread.x]);
       }).dimensions([800, 600]).graphical(true);
         return img;
   }
   var toimg1 = makeRender();
   var toimg2 = makeRender();

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
function amakeSobelFilter(mode) {
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
//gaussian blur 3x3 kernel
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

          // Separable kernel
var kernelX = new Array(1/16,  4/16,  6/16,  4/16, 1/16 );
var kernelY = new Array(1/16,  4/16,  6/16,  4/16, 1/16 );
var temp = new Array(0,0,0,0,0);
var c=0;
//row
for(var j=0;j<5;j++)
//column
  for(var i =0;i<5;i++)
  temp[i]+=A[this.thread.z][this.thread.y-2+j][this.thread.x-2+i]*kernelY[i];

for(var i=0;i<5;i++)
  c= temp[i]*kernelX[i];

                 return A[this.thread.z][this.thread.y][this.thread.x];
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
                return A[this.thread.z][this.thread.y][this.thread.x]+value;
         } else {
            return A[this.thread.z][this.thread.y][this.thread.x];
         }
  },opt);
     return filt;
  }

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


                         return 0.2989 *A[0][this.thread.y][this.thread.x]+0.5870 *A[1][this.thread.y][this.thread.x]+0.1140 *A[2][this.thread.y][this.thread.x];
               } else {
                  return A[this.thread.z][this.thread.y][this.thread.x];
               }
        },opt);
           return filt;
        }
