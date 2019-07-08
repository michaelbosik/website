/*
 * Project 1 - Computer Graphics
 *
 * Written by - Michael Bosik
 * Username - mbosik
 * 
 * Extra Credit:
 * When in draw mode, plotted points are given the current selected color.
 * Points connected by a line with different colors have a gradient between them.
 */

var points = []; //Points matrix
var colors = []; //Color matrix
var extents = []; //Default orthographic extents, would be changed if the file has new ones
var gl;

var openEvent; //Saves the event of which file was opened in file mode
var R = 0.0,
    G = 0.0,
    B = 0.0; //Used for changing RGB values in rendering
var mode = 'file'; //Used to determine if the program is in draw or file mode

var newSeg = true; //Used in draw mode to determine if the next point starts a new segment
var userSegs = [[]]; //Array of groups of coordinates that the user draws
var userColors = [[]]; //Array of colors for the groups of coordinates
var polyCnt = 0; //Count of the amount of segments the user draws

function main() {

    var currColor = 0; //Keeps track of the current color that points are being drawn in

    var canvas = document.getElementById('webgl');
    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    gl.canvas.width = gl.canvas.clientWidth;
    gl.canvas.height = gl.canvas.clientHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);

    window.onkeypress = function(event) {

        //Detect which key was pressed
        switch (event.key) {

            case 'f': //Changes program to file mode
                var components = document.getElementsByClassName('fileMode');
                for(i = 0; i < components.length; i++)
                    components[i].style.display = 'block'; //Show all components necessary in file mode

                components = document.getElementsByClassName('drawMode');
                for(i = 0; i< components.length; i++)
                    components[i].style.display = 'none'; //Hide all components on screen from draw mode

                console.log("Mode changed to: 'filemode'");
                mode = 'file'; //Change mode to file
                points = []; //Clear points array
                colors = []; //Clear colors array

                gl.clearColor(1.0, 1.0, 1.0, 1.0); //Clear the screen to white
                gl.clear(gl.COLOR_BUFFER_BIT); //Clear color buffer
                
                break;

            case 'd': //Changes program to draw mode
                var components = document.getElementsByClassName('fileMode');
                for(i = 0; i < components.length; i++)
                    components[i].style.display = 'none'; //Hide all components on screen from file mode

                components = document.getElementsByClassName('drawMode');
                for(i = 0; i< components.length; i++)
                    components[i].style.display = 'block'; //Show all components necessary for draw mode

                console.log("Mode changed to: 'drawmode'");
                mode = 'draw'; //Change mode to draw
                points = []; //Clear points array
                colors = []; //Clear colors array
                
                extents = [0, gl.canvas.height, gl.canvas.width, 0];

                gl.clearColor(1.0, 1.0, 1.0, 1.0); //Clear the screen to white
                gl.clear(gl.COLOR_BUFFER_BIT); //Clear color buffer

                userSegs = [[]];
                userColors = [[]];
                polyCnt = 0;
                newSeg = true;

                gl.clearColor(1.0, 1.0, 1.0, 1.0); //Clear the screen to white
                gl.clear(gl.COLOR_BUFFER_BIT); //Clear color buffer
                
                break;

            case 'c': //Toggle the current color being drawn to the screen (Black, Red, Green, Blue)
                currColor++;
                if (currColor > 3)
                    currColor = 0;

                if (currColor == 0) { //Black
                    R = 0.0;
                    G = 0.0;
                    B = 0.0;
                    console.log("Color changed to: BLACK");
                } else if (currColor == 1) { //Red
                    R = 1.0;
                    G = 0.0;
                    B = 0.0;
                    console.log("Color changed to: RED");
                } else if (currColor == 2) { //Green
                    R = 0.0;
                    G = 1.0;
                    B = 0.0;
                    console.log("Color changed to: GREEN");
                } else if (currColor == 3) { //Blue
                    R = 0.0;
                    G = 0.0;
                    B = 1.0;
                    console.log("Color changed to: BLUE");
                }
                if (mode == 'file') {
                    openFile(openEvent); //Redraw the file if in file mode
                }
                break;
        }
    }

    window.onkeydown = function(event){
        switch(event.key){
            case 'b': //Toggle ability for new segment in draw mode
                newSeg = true;
                break;
        }
    }

    window.onkeyup = function(event){
        switch(event.key){
            case 'b': //Toggle ability for new segment in draw mode
                newSeg = false;
                break;
        }
    }

    window.onclick = function(event) {
        if(mode == 'draw'){
            if(newSeg)
                polyCnt++;
            drawMode(event);
        }
    }
}

/*
 * render() - Creates the necessary buffers, projections and transformation matrices
 * to display images to the render window
 */
function render() {

    //Use the extents to set the orthographic projection
    var thisProj = ortho(extents[0], extents[2], extents[3], extents[1], -1, 1);

    var width = extents[2] - extents[0]; //Determine the width of the image
    var height = extents[1] - extents[3]; //Determine the height of the image

    //Adjust the size of the viewport according to the aspect ratio of the image
    if(width > height){
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.width/(width/height));
    }
    else if(height > width){
        gl.viewport(0, 0, gl.canvas.height/(height/width), gl.canvas.height);
    }
    else {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    //Flip the drawn point in drawing mode
    var theta = 0;
    if(mode == 'draw'){
        theta = 180;
    }

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'projMatrix'), false, flatten(thisProj));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'modelMatrix'), false, flatten(rotateX(theta)));
    
    //Create a drawing buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer); //bind buffer to the canvas array
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW); //fill the buffer with points data

    var vPosition = gl.getAttribLocation(program, "vPosition"); //get the value of vPosition
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Set clear color
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    gl.drawArrays(gl.LINE_STRIP, 0, points.length);
}

/*
 * openFile(event) - parses the .dat files to retrieve segment coordinates
 * determines the extents for the image and necessary image rotation
 */
function openFile(event) {

    if(event == undefined){
        console.log("No file selected.");
        return;
    }

    openEvent = event;

    //Create a FileReader to read our data file
    var data = new FileReader();

    data.readAsText(event.target.files[0]);

    //When the file loads, run this method
    data.onload = function() {
        console.log("Opened file: " + event.target.files[0].name + "\n");

        extents = [0, 480, 640, 0];

        var lines = data.result.split('\n'); //Splits each line of the file by its new line character
        var currentLine = 0; //Keeps track of the current line being parsed in the file

        //Find if the file has a comment line by looking for a line with a *
        //Set the current line to the line past the comment line to ignore the lines above
        for (i = 0; i < lines.length; i++) {
            if (lines[i].includes('*', 0)) {
                currentLine = i + 1;
                i = lines.length;
            }
        }

        //Check if the current line contains no information, move to the next line
        //Some data files are double spaced making this necessary in multiple places
        if (lines[currentLine] == '')
            currentLine++;

        //Detect if extents are present and parse them to the extents array
        if (lines[currentLine].includes(' ')) {
            var extentLine = lines[currentLine].split(" ");
            for (k = 0; k < extentLine.length; k++) {
                if (extentLine[k] == '') {
                    extentLine.splice(k, 1);
                    k--;
                }
            }
            for (i = 0; i < extentLine.length; i++) {
                extents[i] = parseFloat(extentLine[i]);
            }
            currentLine++;
        }

        if (lines[currentLine] == '')
            currentLine++;

        parsePoints(lines, currentLine);
    }
}

/*
 * parsePoints(lines, currentLine) - helper method for openFile() that 
 * iterates through each line of the lines array to push points to the
 * points array
 */
function parsePoints(lines, currentLine) {
    //Amount of different groups of point coordinates there are
    var loopAmt = lines[currentLine];
    currentLine++;

    //Iterate through the groups of point coordinates
    for (i = 0; i < loopAmt; i++) {

        //Reset the points and color arrays
        points = [];
        colors = [];

        if (lines[currentLine] == '')
            currentLine++;

        //Amount of point coordinates in current group
        var pointsAmt = lines[currentLine];
        currentLine++;

        //Iterate through the coordinates in the current group
        for (j = 0; j < pointsAmt; j++) {

            if (lines[currentLine] == '')
                currentLine++;

            //Some data files have point coordinates separated by a single space and some by a double space
            //Check which one and split() accordingly
            if (lines[currentLine].includes(' ')) {
                point = lines[currentLine].split(' ');
                for (k = 0; k < point.length; k++) {
                    if (point[k] == '') {
                        point.splice(k, 1);
                        k--;
                    }
                }
                currentLine++;
                //Push the current point x and y to the points array
                points.push(vec4(point[0], point[1], 0.0, 1.0));

                //Push a color to the color array
                colors.push(vec4(R, G, B, 1.0));
            }
        }
        render(); //Render points
    }
}

/*
 * drawMode() - contains all of the processes for drawing segments 
 * to the screen and detecting user input in draw mode
 */
function drawMode(event){

    //If the current line segment has more than 100 points or the user is holding 'b', new segment
    if (points.length >= 100 || newSeg){
        points = [];
        colors = [];
        userSegs[polyCnt] = new Array(); //Allocate space for a new array in the user segments array
        userColors[polyCnt] = new Array(); //Same for color array
        newSeg = false;
    }

    //Check if the user has clicked within the canvas space
    if(event.clientX < gl.canvas.width && event.clientY < gl.canvas.height){
        userSegs[polyCnt-1].push(vec4(event.clientX, event.clientY, 0.0, 1.0)); //Add the mouse position to the user segment array
        userColors[polyCnt-1].push(vec4(R, G, B, 1.0));
    }

    for(i=0; i<polyCnt; i++){
        points = [];
        colors = [];

        //Iterate through the user segment matrix and render each segment
        for(j=0; j<userSegs[i].length; j++){
            points.push(userSegs[i][j]);
            colors.push(userColors[i][j]);
        }
        render();
    }
}