
   var loadedImage = false;
   var arr = [];

   var filtering = 0;
   var animation = true;
   var firsttime = true;

   var usingGPU = false;   
   //filter variables
   var sobel = false;
   var blur = false;
   var emboss = false;

	function toggleSobel( el ) {
      if ( el.value === "Sobel Filter Disabled" ) {
         sobel = true;
         el.value = "Sobel Filter Enabled";
      } else {
         sobel = false;
         el.value = "Sobel Filter Disabled";
      }
   }
   function toggleBlur( el ) {
      if ( el.value === "Blur Filter Disabled" ) {
         blur = true;
         el.value = "Blur Filter Enabled";
      } else {
         blur = false;
         el.value = "Blur Filter Disabled";
      }
   }
   function toggleEmboss( el ) {
      if ( el.value === "Emboss Filter Disabled" ) {
         emboss = true;
         el.value = "Emboss Filter Enabled";
      } else {
         emboss = false;
         el.value = "Emboss Filter Disabled";
      }
   }

   function change( el ) {
      if ( el.value === "Using CPU" ) {
         usingGPU = true;
         el.value = "Using GPU";
      } else {
         usingGPU = false;
         el.value = "Using CPU";
      }
   }
   function changeFilter( el ) {
      if ( el.value === "Filtering" ) {
         filtering = 1;
         el.value = "No Filter";
      } else {
         filtering = 0;
         el.value = "Filtering";
      }
   }

   function changeAnimation( el ) {
      if ( el.value === "Animation" ) {
	animation = false;
	el.value = "No Animation";
    } else {
	animation = true;
	el.value = "Animation";
    }
}


function loadImage() {
   var canvas = document.getElementById("backimageCanvas");
   var ctx = canvas.getContext('2d');
   var imag = document.getElementById("backimage");
   ctx.drawImage(imag, 0, 0);
   imag.style.display = 'none';

   var imageData = ctx.getImageData(0, 0, 800, 600);

   for (var channel=0; channel<4; channel++) {
      arr.push([]);
      for (var y=0; y<600; y++) {
         arr[channel].push([]);
      }
   }
   var pointer = 0;
   for (var y=0; y<600; y++) {
      for (var x=0; x<800; x++) {
         arr[0][600-y-1][x] = imageData.data[pointer++]/256;
         arr[1][600-y-1][x] = imageData.data[pointer++]/256;
         arr[2][600-y-1][x] = imageData.data[pointer++]/256;
         arr[3][600-y-1][x] = imageData.data[pointer++]/256;
      }
   }
   loadedImage = true;
}


