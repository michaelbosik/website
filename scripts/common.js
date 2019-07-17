/* Michael Bosik */

/*
 * Show/Hide element
 */

 function loadMain(){
    typeWriter(0, "title1", "<h1>Hi, Im Michael!</h1>"); 
    setTimeout(typeWriter, 1500, 0, "title2", "<h2>Welcome to my website!</h2>", 0);
 }

 function showHide(element){
     var x = document.getElementById(element);
     if(x.style.display === "none"){
         x.style.display = "block";
     }
     else{
         x.style.display = "none";
     }
 }

 function typeWriter(i, id, txt) {
    if (i < txt.length) {
      document.getElementById(id).innerHTML += txt.charAt(i);
      setTimeout(typeWriter, 50, ++i, id, txt);
    }
  }