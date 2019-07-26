/* Michael Bosik */

/*
 * Show/Hide element
 */

 function loadMain(){
    document.getElementById("title1").style.fontFamily = "Menlo";
    document.getElementById("title2").style.fontFamily = "Menlo";
    typeWriter(0, "title1", "<h1>Hi, I'm Michael!</h1>");
    setTimeout(typeWriter, 1500, 0, "title2", "<h2>Welcome to my website!</h2>", 0);
  }

 function typeWriter(i, id, txt) {
    if (i < txt.length) {
      document.getElementById(id).innerHTML += txt.charAt(i);
      setTimeout(typeWriter, 50, ++i, id, txt);
    } else {
      txt = txt.substring(txt.indexOf(">")+1, txt.indexOf("</"));
      document.getElementById(id).innerHTML = "";
      document.getElementById(id).innerHTML = txt;
      document.getElementById(id).style.fontFamily = "Source Sans Pro";
    }
  }