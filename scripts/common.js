/* Michael Bosik */

/*
 * loadMain() - initiates typewriter effect on page load
 */
function loadMain() {
	document.getElementById("title1").style.fontFamily = "Source Sans Pro";
	document.getElementById("title2").style.fontFamily = "Source Sans Pro";
	typeWriter(0, "title1", "Hi, I'm Michael!");
	setTimeout(typeWriter, 1300, 0, "title2", "Welcome to my website!", 0);
}

/*
 * typeWriter(count, id, text) - recursively called to write letter by letter to the screen
 */
function typeWriter(i, id, txt) {
	if (i < txt.length) {
		document.getElementById(id).innerHTML += txt.charAt(i);
		setTimeout(typeWriter, 50, ++i, id, txt);
	}
}