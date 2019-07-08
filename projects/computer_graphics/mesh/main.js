/*
 * Project 2 - Computer Graphics
 * 
 * Written by - Michael Bosik
 * Username - mbosik
 * 
 * Extra Credit: 
 * 
 * - Ability to change between moving the mesh in space or moving the camera in space
 * - Ability to toggle camera focus to static point or follow mesh
 * - Ability to change the speed at which mesh or camera is moved
 */ 

var gl;
var program;

var points = [];
var colors = [];
var extents = [];

var vertices = []; //Array of all vertices in the file (array of arrays)
var polygons = []; //Array of all groups of vertices in the file (array of array of arrays)
var vAmt, pAmt;

var theta = 0;

var rotation = false;
var breathing = false;
var id;

var camX, camY, camZ; //Camera position coordinates
var midX, midY, midZ; //Mesh center position coordinates
var lookX, lookY, lookZ; //Camera look at coordinates
var movSpeed = 0.5; //Movement speed for camera and mesh

var mode = 'mesh';
var cameraMode = 'static';

/*
 * changeSpeed(speed) - changes the camera speed to the given speed from the slider
 */
function changeSpeed(speed){
    movSpeed = speed/100;
    writeHTML();
}

function main(){
    var canvas = document.getElementById('webgl');
    gl = WebGLUtils.setupWebGL(canvas);

    if(!gl){
        console.log('Failed to initialize WebGL');
        return;
    }

    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    gl.canvas.width = gl.canvas.clientWidth;
    gl.canvas.height = gl.canvas.clientHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    writeHTML();

    window.onkeydown = function(event){

        switch(event.key){

            case 'x': //Positive X
                if(mode == 'cam')
                    camX += movSpeed;
                if(mode == 'mesh')
                    midX -= movSpeed;
                break;
            
            case 'c': //Negative X
                if(mode == 'cam')
                    camX -= movSpeed;
                if(mode == 'mesh')
                    midX += movSpeed;
                break;
            
            case 'y': //Positive Y
                if(mode == 'cam')
                    camY += movSpeed;
                if(mode == 'mesh')
                    midY -= movSpeed;
                break;

            case 'u': //Negative Y
                if(mode == 'cam')
                    camY -= movSpeed;
                if(mode == 'mesh')
                    midY += movSpeed;
                break;

            case 'z': //Positive Z
                if(mode == 'cam')
                    camZ += movSpeed;
                if(mode == 'mesh')
                    midZ -= movSpeed;
                break;

            case 'a': //Negative Z
                if(mode == 'cam')
                    camZ -= movSpeed
                if(mode == 'mesh')
                    midZ += movSpeed;
                break;
        }
    }

    window.onkeypress = function(event){

        switch(event.key){

            case 'n': //Toggle movement mode to 'cam' or 'mesh'
                if(mode == 'mesh')
                    mode = 'cam';
                else
                    mode = 'mesh';
                break;
            
            case 'j': //Toggle camera following between static and follow
                if(cameraMode == 'static')
                    cameraMode = 'follow';
                else if(cameraMode == 'follow'){
                    cameraMode = 'static';
                    lookX = 0-midX;
                    lookY = 0-midY;
                    lookZ = 0-midZ;
                }
                break;

            case 'r': //Rotate over X
                if(rotation)
                    rotation = false;
                else
                    rotation = true;
                break;

            case 'b': //Toggle breathing
                if(breathing)
                    breathing = false;
                else
                    breathing = true;
                break;
        }
    }
}

/*
 * openFile(event) - loads the file input by the user and calls
 * necessary methods to load and draw the contents to the screen
 */
function openFile(event){

    if(event == undefined){
        console.log("No file selected.");
        return;
    }

    var file = new FileReader();

    file.readAsText(event.target.files[0]);

    file.onload = function(){
        cancelAnimationFrame(id);

        console.log("Opened file: " + event.target.files[0].name);

        var lines = file.result.split("\n");

        /* HEADER PARSING */
        if(!lines[0].includes("ply")){
            console.log("Invalid file format. Aborting...");
            return false;
        }

        verticesAndPolygons(lines);

        gl.enable(gl.DEPTH_TEST); //Enables depth in view
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        bufferScreen();
        render();
    }
}

/*
 * calculateExtents() - calculates the extents of a mesh
 */
function calculateExtents(){
    
    //Left(-X), Right(+X), Bottom(-Y), Top(+Y), Near(-Z), Far(+Z)
    var l = vertices[0][0], r = vertices[0][0], b = vertices[0][1], t = vertices[0][1], n = vertices[0][2], f = vertices[0][2];

    /* Calculate extents */
    for(i = 0; i < vAmt; i++){

        var vX, vY, vZ;
        vX = vertices[i][0];
        vY = vertices[i][1];
        vZ = vertices[i][2];

        if(vX < l) //Left
            l = vX;
        if(vX > r) //Right
            r = vX;
        if(vY < b) //Bottom
            b = vY;
        if(vY > t) //Top
            t = vY;
        if(vZ < n) //Near
            n = vZ;
        if(vZ > f) //Far
            f = vZ;
    }

    extents = [l, r, b, t, n, f]; //Extents

    /* Calculate the center of the mesh */
    midX = (r+l)/2;
    midY = (t+b)/2;
    midZ = (n+f)/2;
}

/*
 * verticesAndPolygons(lines) - parses each line in the file to determine the many
 * different vertices and polygons.
 * stores each possible point in the 3D drawing to the points array
 */
function verticesAndPolygons(lines){
    
    var R = 1, G = 1, B = 1;

    var currentLine = 9; //Keeps track of the current line of the file starting at line 9 after the header

    vertices = [];
    polygons = [];
    points = [];
    colors = [];
    theta = 0;

    rotation = false;
    breathing = false;
    mode = 'mesh';
    cameraMode = 'static';
    
    vAmt = lines[2].split(" ")[2]; //Amount of vertices in this file
    pAmt = lines[6].split(" ")[2]; //Amount of polygons in this file

    /* VERTEX PARSING */
    for(i = 0; i < vAmt; i++){
        vertices[i] = lines[currentLine].split(" "); //Coordinates of point
        vertices[i].splice(3, 1); //Get rid of extra blank value
        for(j = 0; j < 3; j++){
            vertices[i][j] = parseFloat(vertices[i][j]);
        }
        currentLine++;
    }

    calculateExtents();

    //Camera original position
    camX = 0;
    camY = 0;
    camZ = 10 * (Math.abs(extents[4]) + Math.abs(extents[5]));

    //Camera original look at
    lookX = 0;
    lookY = 0;
    lookZ = 0;

    /* POLYGON PARSING */
    for(i = 0; i < pAmt; i++){
        var tPoly = lines[currentLine].split(" ");
        vAmt = tPoly[0]; //Amount of vertices is in the first place of this line

        polygons[i] = []; //Each polygon is an array of arrays (array of vertices)

        //Grab the particular vertex from the vertex array and save it to a polygon
        for(j = 0; j < vAmt; j++){
            polygons[i][j] = vertices[tPoly[j+1]];
        }
        currentLine++;
    }

    //Iterate through all of the polygons and their vertices, and push each point to the points array
    for(i = 0; i < polygons.length; i++){
        R = Math.random();
        G = Math.random();
        B = Math.random();
        for(j = 0; j < polygons[i].length; j++){
            points.push(vec4(polygons[i][j][0], polygons[i][j][1], polygons[i][j][2], 1.0));
            colors.push(vec4(R, G, B, 1.0));
        }
    }
    //points.push(vec4(midX, midY, midZ, 1.0));
    //colors.push(vec4(1.0, 0.0, 0.0, 1.0));
}

/*
 * bufferScreen() - sets up the screen with all of the necessary buffers
 * for position, color, projections, etc.
 * calls the render() method to begin animation
 */
function bufferScreen(){

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var vBuffer = gl.createBuffer(); //Create a buffer for vertecies
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer); //Bind the vertex buffer to an ARRAY_BUFFER
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW); //Fill the buffer with the values of the points array

    var vPosition = gl.getAttribLocation(program, "vPosition"); //Get the value of vPosition from program
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0); 
    gl.enableVertexAttribArray(vPosition);

    //Specify the vertex size
	var offsetLoc = gl.getUniformLocation(program, "vPointSize");
	gl.uniform1f(offsetLoc, 10.0);

    var cBuffer = gl.createBuffer(); //Create a buffer for colors
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer); //Bind the color buffer to an ARRAY_BUFFER
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW); //Fill the buffer with the values of the colors array

    var vColor = gl.getAttribLocation(program, "vColor"); //Get the value of vColor from program
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var fovy = 30; //Field of View
    var aspect = 1; //Aspect Ratio
    var thisProj = perspective(fovy, aspect, extents[5], extents[4]); //Set the perspective projection

	var projMatrix = gl.getUniformLocation(program, 'projMatrix');
	gl.uniformMatrix4fv(projMatrix, false, flatten(thisProj));

    // Set clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
}

/*
 * calculateNormals(i) - calculates the normal of the current polygon
 * using the newell method
 */
function calculateNormals(i){

    //NEWELL METHOD
    var normal = [0, 0, 0];
    for(j = 0; j < 3; j++){
        var currentVertex = points[i+j];
        var nextVertex = points[(i+j+1)%3];

        normal[0] = (normal[0] + ((currentVertex[1] - nextVertex[1]) * (currentVertex[2] + nextVertex[2])));
        normal[1] = (normal[1] + ((currentVertex[2] - nextVertex[2]) * (currentVertex[0] + nextVertex[0])));
        normal[2] = (normal[2] + ((currentVertex[0] - nextVertex[0]) * (currentVertex[1] + nextVertex[1])));
    }
    return normalize(normal);
}

/*
 * breathing() - moves each vertex along its normal to simulate
 * a "breathing" animation
 */
function breathe(){
    var normals = [];

    for(i = 0; i < points.length; i+=3){     
       normals[i] = calculateNormals(i); //Calculate normals with Newell Method
    }

    for(i = 0; i < points.length; i+=3){
        for(j = 0; j < 3; j++){
            for(k = 0; k < 3; k++){
                points[i+j][k] += normals[i][k];
            }
        }
    }
    bufferScreen();
}

/*
 * render() - calculates translation, rotation, scaling of mesh and draws
 * all arrays to the screen
 * handles animation
 */
function render(){
    
    //Calculate rotation, translation of matrix
    if(extents[0] == (extents[1] * -1)){
        var rotMatrix = rotateX(theta);
        var translateMatrix = translate(0-midX, 0-midY, 0-midZ);
        var ctMatrix = mult(translateMatrix, rotMatrix);
    }
    else{
        var rotMatrix = rotate(theta, vec3(midX, 0, 0));
        var translateMatrix = translate(0-midX, 0-midY, 0-midZ);
        var ctMatrix = mult(rotMatrix, translateMatrix);
    }
    
    //Only rotate if activated
    if(rotation)
        theta += movSpeed;

    if(breathing)
        breathe();

    //Camera is located at this location
    var eye = vec3(camX, camY, camZ);

    writeHTML();

    //Determine where the camera should look based on camera look mode
    var at; 
    if(cameraMode == 'follow')
        at = vec3(0-midX, 0-midY, 0-midZ);
    else if(cameraMode == 'static')
        at = vec3(lookX, lookY, lookZ);

    var up = vec3(0, 1, 0); //Upwards is positive Y
    var viewMatrix = lookAt(eye, at, up); //Position and aim the camera

    var ctMatrixLoc = gl.getUniformLocation(program, "modelMatrix");
    gl.uniformMatrix4fv(ctMatrixLoc, false, flatten(ctMatrix));
    
    var viewMatrixLoc = gl.getUniformLocation(program, "viewMatrix");
    gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(viewMatrix));

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, points.length);
    
    id = requestAnimationFrame(render);
}

/*
 * writeHTML() - writes values of camera position, mesh position, modes and speed to the html document
 */
function writeHTML(){
    
    //This is how variable values are passed to the html doc to be printed to the screen
    document.getElementById('cameraCoordinates').innerHTML= ("Camera Coordinates:</br><strong>X:</strong> " + camX 
                                                     + "</br><strong>Y:</strong>  " + camY 
                                                     + "</br><strong>Z:</strong>  " + camZ);
    document.getElementById('meshCoordinates').innerHTML= ("Mesh Coordinates:</br><strong>X:</strong>  " + midX 
                                                     + "</br><strong>Y:</strong>  " + midY 
                                                     + "</br><strong>Z:</strong>  " + midZ);
    document.getElementById('mode').innerHTML= ("Current Mode: " + mode + "</br>Camera Mode: " + cameraMode);
    document.getElementById('speed').innerHTML= ("Speed: " + movSpeed);
}