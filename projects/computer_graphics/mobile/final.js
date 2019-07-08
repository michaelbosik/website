/*
 * Michael Bosik
 * mbosik
 * Final Project
 * 
 * PLEASE READ THE README FILE
 * 
 * EXTRA CREDIT:
 * - The mobile is completely procedurally generated. I made an algorithm that takes a user entered amount of shapes to draw, and will generate
 * a mobile in realtime with each shape being completely randomized. 
 * - Each shape has its own random type (cube or sphere), color, scale, rotation speed, hanging height, across distance and children
 * - The amount of shapes can be adjusted using the slider on the webpage  (This required me to completely rewrite my project 1 submission)
 */

var stack = []; //Heirarchy stack
var shapes = []; //Array of shapes
var numShapes = 8; //Amount of shapes in the scene
var BACKGROUND = numShapes; //ID of the background planes in the shapes array
var currShape = 0; //Keeps track of the current shape in the shape array

var texture;
var images = [];

//Constants to identify values in a shape
const VERTICES = 0;
const COLOR = 1;
const SCALE = 2;
const DOWN = 3;
const ACROSS = 4;
const THETA = 5;
const SPEED = 6;
const NORMALS = 7;
const NEWELLS = 8;
const TEXTURE = 9;

var cutOffAngle = 0.985; //Spotlight cutoff
var mode = "Gouraud"; //Shading mode
var textured = false; //Toggles textures
var reflection = false; //Toggles reflections
var refraction = false; //Toggles refractions
var shadows = false; //Toggles shadows
const DIVIDES = 4; //Amount of subdivides that each sphere undergoes

var gl, program, canvas, id; 
var projMatrix, modelView, pMatrix, mvMatrix;
var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
var cubeMap; //Environment Map

var ambientStrength = 0.2; //Ambient lighting
var lightColor = vec4(1.0, 1.0, 1.0, 1.0);
var lightPosition = vec4(2.0, 2.0, 2.0, 0.0);
var materialShininess = 20.0;

//Vertices in the left wall
var wall1verts = [
    vec4( -1, -1, 0, 1),
    vec4( 0, -1, -1, 1),
    vec4( 0, 1, -1, 1),
    vec4( -1, 1, 0, 1)
];

//Vertices in the right wall
var wall2verts = [
    vec4( 1, -1, 0, 1),
    vec4( 0, -1, -1, 1),
    vec4( 0, 1, -1, 1),
    vec4( 1, 1, 0, 1)
];

//Vertices in the floor
var floorverts = [
    vec4( 1, -1, 0, 1),
    vec4( 0, -1, 1, 1),
    vec4( -1, -1, 0, 1),
    vec4( 0, -1, -1, 1)    
];

//Vertices in a cube
var cubeVertices = [
    vec4( -1.0, -1.0,  1.0, 1.0 ),
    vec4( -1.0,  1.0,  1.0, 1.0 ),
    vec4(  1.0,  1.0,  1.0, 1.0 ),
    vec4(  1.0, -1.0,  1.0, 1.0 ),
    vec4( -1.0, -1.0, -1.0, 1.0 ),
    vec4( -1.0,  1.0, -1.0, 1.0 ),
    vec4(  1.0,  1.0, -1.0, 1.0 ),
    vec4(  1.0, -1.0, -1.0, 1.0 )
];

//Vertices in a sphere
var sphereVertices = [
    vec4(0.0, 0.0, -1.0, 1),
    vec4(0.0, 0.942809, 0.333333, 1),
    vec4(-0.816497, -0.471405, 0.333333, 1),
    vec4(0.816497, -0.471405, 0.333333,1)
];

//Vertices for a texture
var texCoord = [
	vec2(0.0, 0.0),
	vec2(0.0, 1.0),
	vec2(1.0, 1.0),
	vec2(1.0, 0.0)
];

function main(){
	canvas = document.getElementById('webgl');
    gl = WebGLUtils.setupWebGL(canvas);
	if (!gl){
	    console.log('Failed to get the rendering context for WebGL');
		return;
    }

	program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.enable(gl.DEPTH_TEST);
    
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    projMatrix = gl.getUniformLocation(program, "projectionMatrix");
    modelView = gl.getUniformLocation(program, "modelMatrix");

    pMatrix = perspective(30, canvas.width/canvas.height, 2, -2);
    gl.uniformMatrix4fv(projMatrix, false, flatten(pMatrix));

    eye = vec3(0, 0, 10);
    mvMatrix = lookAt(eye, at, up);

    loadCubeMapImages();
    changeShapes(numShapes); //Begin rendering shapes

    textured = false;

    //Keyboard input
    window.onkeypress = function(event){

        switch(event.key){

            case 'p': //Increase spotlight cutoff angle
                cutOffAngle += 0.001;
                if(cutOffAngle > 0.99)
                    cutOffAngle = 0.99;
                break;

            case 'o': //Decrease spotlight cutoff angle
                cutOffAngle -= 0.001;
                if(cutOffAngle < 0.96)
                    cutOffAngle = 0.96;
                break;

            case 'm': //Change shading to Gouraud
                mode = "Gouraud";
                break;

            /*
            case 'n': //Change shading to Flat
                mode = "Flat";
                break;

            case 'b': //Toggle textures
                if(textured){
                    textured = false;
                    console.log("hi");
                }    
                else
                    textured = true;
                break;

            case 'a': //Toggle shadows
                if(shadows)
                    shadows = false;
                else
                    shadows = true;
                break;
            
            case 'c': //Toggle reflections
                if(reflection)
                    reflection = false;
                else
                    reflection = true;
                break;

            case 'd': //Toggle refractions
                if(refraction)
                    refraction = false;
                else
                    refraction = true;
                break;
            */
        }
    }
}

/*
 * render() - renders shapes to the scene in heirarchal order
 * Heirarchy is procedural not hard coded so that the mobile can be changed 
 * in realtime
 */
function render(){

    stack = [];
    currShape = 0;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    //doBackground();

    var dir = 1;
    var layer = 1;

    stack.push(mvMatrix);
    placeShape(dir); //Top shape is always in the same place
    dir *= -1; //Alternates direction on each layer

    /* HEIRARCHY LOOP */
    for(var i = 1; i < numShapes; i++){
        stack.push(mvMatrix);
        placeShape(dir);

        //Every 3 shapes have lines between them
        //This was not successfully implemented in time, but see code further down VVV
        if(currShape % 3 == 0){
            drawLines();
        }

        //Each layer on the mobile has only 2 shapes
        //The first shape has no children, the next shape starts a new layer
        if(currShape % 2 == 0){
            mvMatrix = stack.pop();
        }
        else {
            layer++;
            dir *= -1;
        }
    }

    //Pop the stack for each layer
    for(var i = 0; i < layer; i++){
        mvMatrix = stack.pop();
    }

    writeHTML();
    id = requestAnimationFrame(render);
}

/*
 * draw() - draws a shape to the screen
 * calculates the index of vertecies and fills buffers to draw arrays
 * Determines which normals to use and which form of rendering to use such as
 * shadows, textures, reflection, refraction
 */
function draw(){

    index = 0;
    NumVertices = 0;

    //Calculate vertecies in the shape
    for(i = 0; i < shapes[currShape][VERTICES].length; i++){
        index++;
        NumVertices++;
    }

    //If shape is a sphere (more than 36 vertecies)
    if(NumVertices > 36)
        NumVertices = 3; //Draw arrays will draw 3 at a time

    //If shape is a cube (Vertecies not 3)
    if(NumVertices != 3)
        index = 1; //Draw arrays needs to run only once
        
    var normals; //Determine which normals to use for shading
    if(mode == "Gouraud")
        normals = shapes[currShape][NORMALS];
    else if(mode == "Flat")
        normals = shapes[currShape][NEWELLS];

    //Shape vertex buffer
    var pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(shapes[currShape][VERTICES]), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program,  "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    //Shape normal buffer
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation( program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    /*
    //Shape texture buffer
    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(shapes[currShape][TEXTURE]), gl.STATIC_DRAW );
    
    var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.disableVertexAttribArray( vTexCoord );
    */

    if(reflection){
        configureCubeMap();
        if(images.length == 6){
            configureCubeMapImage();
        }
    }

    //Calculate lighting
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(mult(vec4(1, 1, 1, 1), shapes[currShape][COLOR])));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(mult(vec4(1, 1, 1, 1), vec4(1, 1, 1, 1))));
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(mult(vec4(ambientStrength, ambientStrength, ambientStrength, 1.0), shapes[currShape][COLOR])));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
    gl.uniform1f(gl.getUniformLocation(program, "angle"), cutOffAngle);

    for(var i = 0; i < index; i += 3){
        gl.drawArrays(gl.TRIANGLES, i, NumVertices);
    }
}

/*
 * doBackground() - creates background shapes using specific values
 * opposed to random values for normal shapes
 */
function doBackground(){
    for(var i=0; i < 3; i++){
        stack.push(mvMatrix);

        mvMatrix = mult(mvMatrix, translate(0, 3, -4));
        gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix)); 

        var verts = makePlane(i, 6);

        //Shape vertex buffer
        var pBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(verts), gl.STATIC_DRAW);
    
        var vPosition = gl.getAttribLocation(program,  "vPosition");
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
    
        //Shape texture buffer
        var tBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(calcTexture(verts)), gl.STATIC_DRAW );
        
        var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
        gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( vTexCoord );

        if(textured){
            createATexture();
            if(i == 0){
                loadGrass();
                gl.uniform1i(gl.getUniformLocation(program, "tex0"), 0);
            }
            else if (i == 1 || i == 2){
                loadStone();
                gl.uniform1i(gl.getUniformLocation(program, "tex0"), 1);
            }
        }

        //Calculate lighting
        gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(mult(vec4(1, 1, 1, 1), vec4(1, 1, 1, 1))));
        gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(mult(vec4(1, 1, 1, 1), vec4(1, 1, 1, 1))));
        gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(mult(vec4(ambientStrength, ambientStrength, ambientStrength, 1.0), vec4(1, 1, 1, 1))));
        gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
        gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
        gl.uniform1f(gl.getUniformLocation(program, "angle"), cutOffAngle);
    
        gl.drawArrays( gl.TRIANGLES, 0, 6 );

        mvMatrix = stack.pop();
    }   
}

/*
 * calcTexture() - returns the coordinates for a texture to be mapped to a shape
 */
function calcTexture(verts){
    var texCoords = [];
    for(var i = 0; i < verts.length/6; i++){
        texCoords.push(texCoord[0]);
        texCoords.push(texCoord[1]);
        texCoords.push(texCoord[2]);
        texCoords.push(texCoord[0]);
        texCoords.push(texCoord[2]);
        texCoords.push(texCoord[3]);
    }
    return texCoords;
}

/*
 * createATexture() - creates a texture to be rendered over
 */
function createATexture() {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 255, 255, 
                        255, 0, 0, 255, 
                        255, 0, 0, 255, 
                        0, 0, 0, 255]));

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

/*
 * configureTexture() - will configure a given image to a texture and pass it to the fragment shader
 */
function configureTexture(image, ind) {
    texture = gl.createTexture();
    
    if(ind == 0){
        gl.activeTexture(gl.TEXTURE0);
    }
    else{
        gl.activeTexture(gl.TEXTURE1);
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    //gl.uniform1i(gl.getUniformLocation(program, "tex" + ind), ind);
}

/*
 * loadGrass() - loads the grass texture
 */
function loadGrass(){
    var image = new Image();
    image.crossOrigin = "";
    image.src = "https://web.cs.wpi.edu/~jmcuneo/grass.bmp";
    image.onload = function() {
        configureTexture(image, 0);
    }
}

/*
 * loadStone() - loads the stone texture
 */
function loadStone(){
    var image2 = new Image();
    image2.crossOrigin = "";
    image2.src = "https://web.cs.wpi.edu/~jmcuneo/stones.bmp";
    image2.onload = function() {
        configureTexture(image2, 1);
    }
}

/*
 * loadCubeMapImages
 */
function loadCubeMapImages(){
    images = [];
    var top = new Image();
    top.crossOrigin = "";
    top.src = "https://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposy.bmp";
    top.onload = function() {
        images.push(top);
    }

    var bottom = new Image();
    bottom.crossOrigin = "";
    bottom.src = "https://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegy.bmp";
    bottom.onload = function() {
        images.push(bottom);
    }

    var left = new Image();
    left.crossOrigin = "";
    left.src = "https://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegx.bmp";
    left.onload = function() {
        images.push(left);
    }

    var right = new Image();
    right.crossOrigin = "";
    right.src = "https://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposx.bmp";
    right.onload = function() {
        images.push(right);
    }

    var front = new Image();
    front.crossOrigin = "";
    front.src = "https://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposz.bmp";
    front.onload = function() {
        images.push(front);
    }

    var back = new Image();
    back.crossOrigin = "";
    back.src = "https://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegz.bmp";
    back.onload = function() {
        images.push(back);
    }
}

/*
 * configureCubeMap() - creates a blank cube map to be written over
 */
function configureCubeMap() {
    cubeMap = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    //Set the texture for each side of the cube
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 0, 255]));
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 255, 255]));
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255]));
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 0, 255]));

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 0);

}

/*
 * configureCubeMapImage() - takes 6 images to put as the environment map
 */
function configureCubeMapImage() {
    cubeMap = gl.createTexture();

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[2]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[0]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[4]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[3]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[1]);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[5]);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.uniform1i(gl.getUniformLocation(program, "texMap"), 1);

}

/*
 * refresh() - called when the "New Mobile" button is clicked
 */
function refresh(){
    numShapes = Math.floor(Math.random() * 12 + 3);
    changeShapes(numShapes);
}

/*
 * changeShapes() - when a new value of numShapes is changed, everything is
 * re-rendered. This method will create all new shapes and background
 */
function changeShapes(value){

    cancelAnimationFrame(id);
    numShapes = parseFloat(value);
    BACKGROUND = numShapes;

    stack = [];

    //doBackground();

    currShape = 0;

    for(var i=0; i<numShapes; i++){
        newShape();
        currShape++;
    }

    render();
}

/*
 * placeShape() - adjusts the shapes position based on its random values and renders it to the screen by
 * calling draw()
 */
function placeShape(dir){
    shapes[currShape][THETA] += shapes[currShape][SPEED]; //Rotate by shapes random speed
    mvMatrix = mult(mvMatrix, translate(shapes[currShape][ACROSS], shapes[currShape][DOWN], 0)); //Translate shape by its random values
    mvMatrix = mult(mvMatrix, rotateY(shapes[currShape][THETA] * dir)); //Rotate shape based on its theta
    gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix)); 
    draw(); //Draws the current shape with its normals and color
    currShape++;
}

/*
 * newShape() - Creates a shape with completly random values for
 * color, scale, down length, across length, rotation speed, type (sphere or cube), normals and texture
 */
function newShape(){
    shapes[currShape] = [];
    shapes[currShape][COLOR] = randomColor();
    shapes[currShape][SCALE] = randomScale();
    shapes[currShape][DOWN] = randomDown();
    shapes[currShape][ACROSS] = calcAcross();
    shapes[currShape][THETA] = 0;
    shapes[currShape][SPEED] = Math.random();
    shapes[currShape][VERTICES] = randShape();
    shapes[currShape][NORMALS] = calculateNormals();
    shapes[currShape][NEWELLS] = newell();
    shapes[currShape][TEXTURE] = calcTexture(shapes[currShape][VERTICES]);
}

/*
 * randomScale() - returns a random scale for a shape to use based on how many shapes are left
 */
function randomScale(){
    var big = (numShapes/(currShape+0.8)) * 0.01;
    var small = 0.1;

    return (Math.random() * big) + small;
}

/*
 * calcAcross() - returns a random amount for a shape to be across based on how many shapes are left
 */
function calcAcross(){
    if(currShape == 0)
        return 0;
    
    var across = ((numShapes/2) / 10 + 3.5) / (1.7*currShape);

    if(currShape % 2 == 1){
        return across *= -1;
    }
    
    return across;
}

/*
 * randomDown() - returns a random amount for a shape to hang down by
 */
function randomDown(){
    if(currShape == 0){
        return 2;
    }

    var long = (numShapes/2) / 10 + 0.5;
    var short = 0.05;

    return ((Math.random() * long) + short) * -1;
}

/*
 * randShape() - draws a random shape (cube or sphere)
 */
function randShape(){
    var shape = Math.floor(Math.random() * 2);

    if(shape == 0){
        return cube();
    }
    if(shape == 1){
        return sphere();
    }
    return -1;
}

/*
 * quad(a, b, c, d) - takes in 4 vertecies and places triangles into an array while scaling
 */
function quad(a, b, c, d){
    var verts = [];
    var indices = [ a, b, c, a, c, d ];
    for (i = 0; i < indices.length; i++){
        verts.push(vec4(cubeVertices[indices[i]][0] * shapes[currShape][SCALE], cubeVertices[indices[i]][1] * shapes[currShape][SCALE], cubeVertices[indices[i]][2] * shapes[currShape][SCALE], 1.0));
    }
    return verts;
}

/*
 * makePlane() - creates a plane using the vertices from the walls or floor
 */
function makePlane(i, scale){

    var verts = [];
    var plane;
    if(i == 0)
        plane = floorverts;
    if(i == 1)
        plane = wall1verts;
    if(i == 2)
        plane = wall2verts;

    var indices = [0, 1, 2, 0, 2, 3];
    for(var i = 0; i < indices.length; i++){
        verts.push(vec4(plane[indices[i]][0] * scale, plane[indices[i]][1] * scale, plane[indices[i]][2] * scale, 1.0));
    }
    return verts;
}

/*
 * cube() - concatenates an array of vertecies to form a cube by calling the quad() method
 */
function cube(){
    var verts = [];
    verts = verts.concat(quad(1, 0, 3, 2 ));
    verts = verts.concat(quad(2, 3, 7, 6 ));
    verts = verts.concat(quad(3, 0, 4, 7 ));
    verts = verts.concat(quad(6, 5, 1, 2 ));
    verts = verts.concat(quad(4, 5, 6, 7 ));
    verts = verts.concat(quad(5, 4, 0, 1 ));
    return verts;
}

/*
 * sphere() - creates an array of vertecies to form a sphere by calling the tetrahedron() method
 */
function sphere(){
    var verts = [];
    verts = tetrahedron();
    return verts;
}

/*
 * triangle(a, b, c) - inserts the points of the 3 vertecies scaled to the spherePoints array
 */
function triangle(a, b, c) {
    var verts = [];
    scale = shapes[currShape][SCALE];
    verts.push(vec4(a[0] * scale, a[1] * scale, a[2] * scale, 1.0));
    verts.push(vec4(b[0] * scale, b[1] * scale, b[2] * scale, 1.0));
    verts.push(vec4(c[0] * scale, c[1] * scale, c[2] * scale, 1.0));
    return verts;
}

/*
 * divideTriangle(a, b, c, count) - subdivides the given triangle count times using recursion
 */
function divideTriangle(a, b, c, count) {
    var verts = [];
    if (count > 0) {
        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);
        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        verts = verts.concat(divideTriangle( a, ab, ac, count - 1));
        verts = verts.concat(divideTriangle( ab, b, bc, count - 1));
        verts = verts.concat(divideTriangle( bc, c, ac, count - 1));
        verts = verts.concat(divideTriangle( ab, bc, ac, count - 1));

        return verts;
    }
    else {
        return triangle( a, b, c );
    }
}

/*
 * tetrahedron() - will create a sphere by subdividing the indices of the passed in vertecies n times
 */
function tetrahedron() {
    var a = sphereVertices[0];
    var b = sphereVertices[1];
    var c = sphereVertices[2];
    var d = sphereVertices[3];
    var n = DIVIDES;

    var verts = [];
    verts = verts.concat(divideTriangle(a, b, c, n));
    verts = verts.concat(divideTriangle(d, c, b, n));
    verts = verts.concat(divideTriangle(a, d, b, n));
    verts = verts.concat(divideTriangle(a, c, d, n));
    return verts;
}

/*
 * calculateNormals() - calculates the surface normals of a shape to the normals of the shape
 */
function calculateNormals(){
    var shape = shapes[currShape][VERTICES];
    var normals = [];
    for(var i = 0; i < shape.length; i++){
        normals.push(shape[i][0], shape[i][1], shape[i][2], 0.0);
    }
    return normals;
}

/*
 * newell(i) - calculates the normal of the current polygon
 * using the newell method
 */
function newell(){

    var shape = shapes[currShape][VERTICES];
    var normals = [];

    //NEWELL METHOD
    for(var i = 0; i < shape.length; i+=3){
        var normal = [0, 0, 0, 1];
        var currentVertex = shape[i];
        var nextVertex = shape[(i+1)%3];

        normal[0] = (normal[0] + ((currentVertex[1] - nextVertex[1]) * (currentVertex[2] + nextVertex[2])));
        normal[1] = (normal[1] + ((currentVertex[2] - nextVertex[2]) * (currentVertex[0] + nextVertex[0])));
        normal[2] = (normal[2] + ((currentVertex[0] - nextVertex[0]) * (currentVertex[1] + nextVertex[1])));

        normals.push(normalize(normal));
    }
    return normals;
}

/*
 * randomColor() - returns a color with random RGB values
 */
function randomColor(){
    R = Math.random();
    G = Math.random();
    B = Math.random();

    var color = vec4(R, G, B, 1.0);
    return color;
}

/*
 * writeHTML() - writes all values to the html page
 */
function writeHTML(){
    //This is how variable values are passed to the html doc to be printed to the screen
    document.getElementById('shapes').innerHTML= ("Amount of shapes: " + numShapes);
    //document.getElementById('mode').innerHTML= ("Current Shading: " + mode);
    document.getElementById('angle').innerHTML= ("Cutoff Angle: " + cutOffAngle);
    //document.getElementById('textures').innerHTML= ("Textures on: " + textured);
    //document.getElementById('shadows').innerHTML= ("Shadows on: " + shadows);
    //document.getElementById('reflections').innerHTML= ("Reflections on: " + reflection);
    //document.getElementById('refractions').innerHTML= ("Refractions on: " + refraction);
}

/*
 * getCenter() - returns the center point of a shape by determining its extents
 */
function getCenter(shape){
    
    //Left(-X), Right(+X), Bottom(-Y), Top(+Y), Near(-Z), Far(+Z)
    var l = shape[VERTICES][0][0], r = shape[VERTICES][0][0], b = shape[VERTICES][0][1], t = shape[VERTICES][0][1], n = shape[VERTICES][0][2], f = shape[VERTICES][0][2];

    /* Calculate extents */
    for(i = 0; i < shape[VERTICES].length; i++){

        var vX, vY, vZ;
        vX = shape[VERTICES][i][0];
        vY = shape[VERTICES][i][1];
        vZ = shape[VERTICES][i][2];

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

    //midX += shape[ACROSS];
    //midY += shape[DOWN];

    return vec4(midX, midY, midZ, 1.0);
}

/*
 * drawLines() - Procedurally generates lines between each 3 shapes
 * Calculates the centers of the 3 shapes positions and calculates averages
 * between centers to generate an array of 6 points (2 points are used twice making 8 points)
 * draws 4 lines between each of the 8 points
 */
function drawLines(){

    var points = [];

    points[0] = getCenter(shapes[currShape-3]); //Top shape center
    points[5] = getCenter(shapes[currShape-2]); //Left shape center
    points[7] = getCenter(shapes[currShape-1]); //Right shape center
    points[2] = vec4(points[5][0], (points[5][1]+points[0][1])/2, points[5][2]); //Halfway between Y axis of left shape center and Top shape center
    points[3] = vec4(points[7][0], (points[7][1]+points[0][1])/2, points[7][2]); //Halfway between Y axis of right shape center and Top shape center
    points[1] = vec4(points[0][0], (points[2][1]+points[3][1])/2, points[0][2]); //Center between all shapes
    points[4] = points[2]; //Mid left shape
    points[6] = points[3]; //Mid right shape

    for(var i = 0; i < points.length; i+=2){

        var line = [points[i], points[i+1]];

        var pBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(line), gl.STATIC_DRAW);

        var vPosition = gl.getAttribLocation(program,  "vPosition");
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);

        /*
        var normals = [];
        for(var i = 0; i < line.length; i++){
            normals.push(line[i][0], line[i][1], line[i][2], 0.0);
        }

        var nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    
        var vNormal = gl.getAttribLocation( program, "vNormal");
        gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vNormal);
        */
    
        var ambientProduct = mult(vec4(ambientStrength, ambientStrength, ambientStrength, 1.0), vec4(1.0, 1.0, 1.0, 1.0)); //Calculate ambient lighting
    
        //Calculate lighting
        gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(vec4(1.0, 1.0, 1.0, 1.0)));
        gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
        gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
        gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
        gl.uniform1f(gl.getUniformLocation(program, "angle"), cutOffAngle);

        gl.drawArrays(gl.LINES, 0, 2);
    }
}