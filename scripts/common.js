/* Michael Bosik */

/*
 * Show/Hide element
 */

 function showHide(element){
     var x = document.getElementById(element);
     if(x.style.display === "none"){
         x.style.display = "block";
     }
     else{
         x.style.display = "none";
     }
 }
  