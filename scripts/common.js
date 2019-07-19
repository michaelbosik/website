/* Michael Bosik */

/*
 * Show/Hide element
 */

 function loadMain(){
    typeWriter(0, "title1", "<h1>Hi, Im Michael!</h1>"); 
    setTimeout(typeWriter, 1500, 0, "title2", "<h2>Welcome to my website!</h2>", 0);
  }

 function typeWriter(i, id, txt) {
    if (i < txt.length) {
      document.getElementById(id).innerHTML += txt.charAt(i);
      setTimeout(typeWriter, 50, ++i, id, txt);
    }
  }

  function makeVisible(tag){
    let pageTop = window.scrollY;
    let pageBottom = pageTop + window.innerHeight;

    if (tag.offsetTop < pageBottom) {
      tag.classList.add('visible');
    }
  }

const fadein = () => { 
    let i = 0;
    let tags = document.getElementsByClassName('fadein');
    for (let tag of tags) {
      setTimeout(makeVisible, i, tag);
      i+=200;
    }
  }
  
  window.addEventListener('scroll', (e) => fadein());