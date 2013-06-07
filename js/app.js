var App = function() {

    var OFF_SCREEN_VALUE = -999,
        DEFAULT_FINGER_POS = {x: OFF_SCREEN_VALUE, y: OFF_SCREEN_VALUE, z: OFF_SCREEN_VALUE},
        DEFAULT_FINGER_ROT = {x: Math.PI * -3/4, y: 0, z: 0},
        FINGER_COLOURS = [
            0xff5555,
            0x55ff55,
            0x55ffff,
            0xffff55,
            0x5555ff,
            0xff55ff,
            0xffffff,
            0x0000aa,
            0x00aa00,
            0x00aaaa
        ];

    var fingerModels = [];

    /*
    var hoveredItems;
    var selectedItems;
    */

    var hoveredItem;
    var selectedItem;

    var hoverTime = 0;

    var items = [];

    var loader = new THREE.JSONLoader();

    var numLoadedModels = 0;

    var hasConnected;
    var hasLoaded;

    // Scene size
    var WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight;

    // Camera and scene attributes
    var VIEW_ANGLE = 60,
        ASPECT = WIDTH / HEIGHT,
        NEAR = 0.1,
        FAR = 1000,
        defaultDistance = 65;

    var CONTAINER_OPACITY_DEFAULT = 0.2; // XXX Put back to 0
    var CONTAINER_OPACITY_HOVER = 0.15;
    var CONTAINER_OPACITY_SELECTED = 0.3;

    var render, renderer, scene, camera, box, box2, box_material, table,
            table_material, balance, balance_material,
            plinth, plinth_material, plinth_geometry;

    var textMaterial1 = new THREE.MeshLambertMaterial({color: 0xffffff}),
        textMaterial2 = new THREE.MeshLambertMaterial({color: 0xffffff}),
        textMaterial3 = new THREE.MeshLambertMaterial({color: 0xffffff}),
        textMaterial4 = new THREE.MeshLambertMaterial({color: 0xffffff});

    var duck1, duck2, duck3, duck4;
    var duckObjs = []; // Obj has {weight: ..., model: ..., label: ...}

    var textColour = new THREE.Color(0xffffff);
    var textSelectedColour = new THREE.Color(0xff0000);
    var textHoveredColour = new THREE.Color(0xcc0000);

    init();

    function init() {

        renderer = new THREE.WebGLRenderer({antialias: true});

        renderer.shadowMapEnabled = true;
        renderer.shadowMapSoft = true;
        renderer.shadowMapType = THREE.PCFSoftShadowMap;

        renderer.setClearColor(new THREE.Color(0x000000));
        renderer.setSize(WIDTH, HEIGHT);

        renderer.clear();

        camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR );
        camera.position.y = 40;
        camera.position.z = defaultDistance;

        camera.lookAt( new THREE.Vector3(0,0,0) );

        // Attach the renderer's canvas element to the container
        $('#container').append(renderer.domElement);

        setupPhysicsAndScene();

        setupButton();

        setupFingerRepresentations();

        //setupGround();
        //setupWeight();

        setupBalanceObjects();

        //loadItems();

        setupLights();

        initEvents();

        // XXX Until we have splash screen, start straight away
        start();

    }

    function initEvents() {

        window.addEventListener( 'resize', onWindowResize, false );

        $('#go').click(function(event) {
            start();
            event.preventDefault();
        });

        $('#restart').click(function(event) {
            restart();
            event.preventDefault();
        });

    }

    function setupPhysicsAndScene() {

        Physijs.scripts.worker = 'js/lib/physijs_worker.js';
        Physijs.scripts.ammo = 'ammo.js';

        scene = new Physijs.Scene;
        scene.setGravity(new THREE.Vector3( 0, -30, 0 ));
        scene.addEventListener('update',
                function() {
                    //console.log('simulate');
                    scene.simulate(); // 0.1, 20 );
                }
        );

    }

    function setupButton() {

        loader.load('models/PUSH.js', function(geometry, materials) {

            var material = new THREE.MeshFaceMaterial(materials);

            var model = new THREE.Mesh( geometry, material );

            model.scale.set(1, 1, 1);

            model.position.set( 30, 30, -5 );

            model.rotation.x = Math.PI / 2;
            //model.rotation.y = -Math.PI;
            model.rotation.z = 0.3;

            model.receiveShadow = true;

            scene.add( model );

        });

    }

    function setupFingerRepresentations() {

        for( var i=0; i < 10; i++ ) {

            var geometry = new THREE.CylinderGeometry(1.5, 1.5, 10);

            /*
            var material = Physijs.createMaterial(
                    new THREE.MeshLambertMaterial({color: FINGER_COLOURS[i], ambient: 0xdadada}),
                    1.0,
                    0.5);

            var fingerModel = new Physijs.CylinderMesh( geometry, material, 10 );
            */

            var fingerModel = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial({color: FINGER_COLOURS[i],
                ambient: 0xdadada}) );

            // Set off-screen to start with
            fingerModel.position.set(DEFAULT_FINGER_POS.x, DEFAULT_FINGER_POS.y, DEFAULT_FINGER_POS.z);
            fingerModel.rotation.set(DEFAULT_FINGER_ROT.x, DEFAULT_FINGER_ROT.y, DEFAULT_FINGER_ROT.z);

            fingerModel.castShadow = true;

            fingerModels[i] = fingerModel;

            console.log('adding finger model ' + i + ' to scene', fingerModel);

            scene.add( fingerModel );

        }

    }

    function setupGround() {

        // Ground
        var ground_geometry = new THREE.PlaneGeometry( 300, 300, 100, 100 );

        var ground_material = Physijs.createMaterial(
                new THREE.MeshBasicMaterial({color: 0xCCCCCC}),
                .4, // low friction
                .6 // high restitution
        );

        var ground = new Physijs.PlaneMesh(
                ground_geometry,
                ground_material,
                0 // mass
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;

        scene.add( ground );

    }

    function setupBalanceObjects() {

        // Tabletop
        table_material = Physijs.createMaterial(
                new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/grass.png' ), ambient: 0xFFFFFF }),
                .9, // high friction
                .2 // low restitution
        );
        table_material.map.wrapS = table_material.map.wrapT = THREE.RepeatWrapping;
        table_material.map.repeat.set( 5, 5 );

        table = new Physijs.BoxMesh(
                new THREE.CubeGeometry(500, 1, 500),
                table_material,
                0, // mass
                { restitution: .2, friction: .8 }
        );
        table.position.y = 0;
        table.receiveShadow = true;
        scene.add( table );

        // Balance
        balance_material = Physijs.createMaterial(
                new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/wood.jpg' ), ambient: 0xFFFFFF }),
                0, // no friction
                0 // no restitution
        );

        balance = new Physijs.ConeMesh(
                new THREE.CylinderGeometry(1, 10, 15, 20, 20, false),
                balance_material,
                0 // mass
        );
        scene.add( balance );

        // Plinth
        plinth_material = Physijs.createMaterial(
                new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/plywood.jpg' ), ambient: 0xFFFFFF }),
                1, // medium friction
                1 // high restitution
        );
        plinth_material.map.wrapS = plinth_material.map.wrapT = THREE.RepeatWrapping;
        plinth_material.map.repeat.set( 1, .5 );
        plinth_geometry = new THREE.CubeGeometry( 50, 1, 10 );
        plinth = new Physijs.BoxMesh( plinth_geometry, plinth_material, 1);
        plinth.position.y = 8.5;
        plinth.receiveShadow = true;
        plinth.castShadow = true;
        scene.add( plinth );

        // Constraint
        var constraint = new Physijs.HingeConstraint(
                balance, // First object to be constrained
                plinth, // OPTIONAL second object - if omitted then physijs_mesh_1 will be constrained to the scene
                new THREE.Vector3( 0, 0, 0 ), // point in the scene to apply the constraint
                new THREE.Vector3( 0, 0, 1 ) // Axis along which the hinge lies - in this case it is the X axis
        );
        scene.addConstraint( constraint );
        constraint.setLimits(
                -Math.PI / 8, // minimum angle of motion, in radians
                Math.PI / 8, // maximum angle of motion, in radians
                1, // applied as a factor to constraint error
                0 // controls bounce at limit (0.0 == no bounce)
        );
        //constraint.enableAngularMotor( target_velocity, acceration_force );
        constraint.disableMotor();


        // Box
        box_material = Physijs.createMaterial(
                new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/wood.jpg' ), ambient: 0xFFFFFF }),
                1, // high friction
                .1 // low restitution
        );

        // Duck 1
        loader.load('models/RubberDucky4.js', function(geometry, materials) {

            var material = new THREE.MeshFaceMaterial(materials);

            //var material = new THREE.MeshBasicMaterial({color: 0xFFFF66});

            duck1 = new Physijs.BoxMesh( geometry, material, 5 );

            duck1.scale.set(4, 4, 4);

            //duck1.position.set( -10, 20, 0 );

            duck1.position.set( -21, 5.95, 25 );

            duck1.rotation.y = Math.PI * 1/4;

            duck1.castShadow = true;
            duck1.receiveShadow = true;

            var textGeo = new THREE.TextGeometry( '4kg', {

                size: 0.75,
                height: 0.5,
                curveSegments: 10,

                font: 'helvetiker',
                weight: 'normal',

                material: 0,
                extrudeMaterial: 1

            });

            var labelMesh = new Physijs.BoxMesh( textGeo, Physijs.createMaterial(
                    textMaterial1,
                    1.0,
                    0.5), 0 );
            labelMesh.position.y = 2;
            labelMesh.rotation.y = -Math.PI * 1/4;

            duck1.add( labelMesh );

            scene.add( duck1 );

            var duckObj = {weight: 4, model: duck1, label: labelMesh};
            duckObjs.push(duckObj);

        });

        // Duck 2
        loader.load('models/RubberDucky4.js', function(geometry, materials) {

            var material = Physijs.createMaterial(
                    new THREE.MeshFaceMaterial(materials),
                    1, // high friction
                    .1 // low restitution
            );

            duck2 = new Physijs.BoxMesh( geometry, material, 1 );

            duck2.scale.set(3, 3, 3);

            // XXX above balance
            //duck2.position.set( 14, 13, 0 );

            duck2.position.set( -6, 4.6, 25 );

            duck2.rotation.y = Math.PI * 1/8;

            duck2.castShadow = true;
            duck2.receiveShadow = true;

            var textGeo = new THREE.TextGeometry( '3kg', {

                size: 1,
                height: 0.5,
                curveSegments: 10,

                font: 'helvetiker',
                weight: 'normal',

                material: 0,
                extrudeMaterial: 1

            });

            var labelMesh = new Physijs.BoxMesh( textGeo, Physijs.createMaterial(
                    textMaterial2,
                    1.0,
                    0.5), 0 );
            labelMesh.position.y = 2;
            labelMesh.rotation.y = -Math.PI * 1/8;

            duck2.add( labelMesh );

            scene.add( duck2 );

            var duckObj = {weight: 3, model: duck2, label: labelMesh};
            duckObjs.push(duckObj);

        });

        // Duck 3
        loader.load('models/RubberDucky4.js', function(geometry, materials) {

            var material = Physijs.createMaterial(
                    new THREE.MeshFaceMaterial(materials),
                    1, // high friction
                    .1 // low restitution
            );

            duck3 = new Physijs.BoxMesh( geometry, material, 1 );

            duck3.scale.set(2, 2, 2);

            // XXX above balance
            //duck3.position.set( 14, 13, 0 );

            duck3.position.set( 7, 3.2, 25 );

            duck3.rotation.y = Math.PI * 1/4;

            duck3.castShadow = true;
            duck3.receiveShadow = true;

            var textGeo = new THREE.TextGeometry( '2kg', {

                size: 1.5,
                height: 0.5,
                curveSegments: 10,

                font: 'helvetiker',
                weight: 'normal',

                material: 0,
                extrudeMaterial: 1

            });

            var labelMesh = new Physijs.BoxMesh( textGeo, Physijs.createMaterial(
                    textMaterial3,
                    1.0,
                    0.5), 0 );
            labelMesh.position.y = 2;
            labelMesh.rotation.y = -Math.PI * 1/4;

            duck3.add( labelMesh );

            scene.add( duck3 );

            var duckObj = {weight: 2, model: duck3, label: labelMesh};
            duckObjs.push(duckObj);


        });

        // Duck 4
        loader.load('models/RubberDucky4.js', function(geometry, materials) {

            var material = new THREE.MeshFaceMaterial(materials);

            //var material = new THREE.MeshBasicMaterial({color: 0xFFFF66});

            duck4 = new Physijs.BoxMesh( geometry, material, 5 );

            duck4.scale.set(1, 1, 1);

            //duck4.position.set( -10, 20, 0 );

            duck4.position.set( 17, 1.8, 25 );

            duck4.rotation.y = Math.PI * 1/8;

            duck4.castShadow = true;
            duck4.receiveShadow = true;

            var textGeo = new THREE.TextGeometry( '1kg', {

                size: 3,
                height: 0.5,
                curveSegments: 10,

                font: 'helvetiker',
                weight: 'normal',

                material: 0,
                extrudeMaterial: 1

            });

            var labelMesh = new Physijs.BoxMesh( textGeo, Physijs.createMaterial(
                    textMaterial4,
                    1.0,
                    0.5), 0 );
            labelMesh.position.y = 2;
            labelMesh.rotation.y = -Math.PI * 1/8;

            duck4.add( labelMesh );

            scene.add( duck4 );

            var duckObj = {weight: 1, model: duck4, label: labelMesh};
            duckObjs.push(duckObj);

        });


    }

    function drawBoundingBox(box, scaleX, scaleY, scaleZ) {

        var length = scaleX * (box.max.x - box.min.x);
        var height = scaleY * (box.max.y - box.min.y);
        var depth =  scaleZ * (box.max.z - box.min.z);
        var boundingBoxGeometry = new THREE.CubeGeometry( length, height, depth );
        for ( var i = 0; i < boundingBoxGeometry.faces.length; i ++ )
        {
            boundingBoxGeometry.faces[i].color.setHex( Math.random() * 0xffffff );
        }
        var boundingBoxMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, vertexColors: THREE.FaceColors, transparent: true, opacity: 0.7 } );
        var boundingBoxMesh = new THREE.Mesh( boundingBoxGeometry, boundingBoxMaterial);

        /*
        var bboxCenter = box.center();
        boundingBoxMesh.translateX (bboxCenter.x);
        boundingBoxMesh.translateY (bboxCenter.y);
        boundingBoxMesh.translateZ (bboxCenter.z);
        */

        scene.add( boundingBoxMesh );

    }

    function setupLights() {

        // Lights

        var ambientLight = new THREE.AmbientLight( 0x777777 );
        scene.add( ambientLight );

        var spotLight = new THREE.SpotLight(0xFFFFFF, 3.0, 300);

        spotLight.position.set( 0, 250, 0 ); // x, y, z
        spotLight.target.position.set( 0, 0, 0 );
        spotLight.castShadow = true;
        spotLight.shadowDarkness = 0.2;

        scene.add( spotLight );

        var spotLight2 = new THREE.SpotLight(0xFFFFFF, 3.0, 300);

        spotLight2.position.set( 0, -250, 0 ); // x, y, z
        spotLight2.target.position.set( 0, 0, 0 );
        spotLight2.castShadow = true;
        spotLight2.shadowDarkness = 0.2;

        scene.add( spotLight2 );

        var spotLight3 =  new THREE.SpotLight(0xFFFFFF, 5.0, 300);

        spotLight3.position.set( 0, 0, 250 ); // x, y, z
        spotLight3.target.position.set( 0, 0, 0 );
        spotLight3.castShadow = true;
        spotLight3.shadowDarkness = 0.2;

        scene.add( spotLight3 );

    }

    function start() {

        console.log('START');

        /*
        document.getElementById('welcome').style.display = 'none';
        document.getElementById('info').style.display = 'block';
        */

        requestAnimationFrame( render );
        //scene.simulate();

        // Set method that gets called with every Leap frame
        Leap.loop(update);

    }

    function restart() {

        console.log('RESTART');

        repositionItems();

        reportNumCorrect(0);

    }

    // Runs every frame
    function update(frame) {

        if( !hasConnected ) {
            hasConnected = true;
            checkLoadedAndConnected();
        }

        leapControl(frame);

        //render();

    }

    function render() {

        requestAnimationFrame( render );

        //camera.lookAt( scene.position );
        renderer.render( scene, camera );

    }

    function onWindowResize(event) {

        WIDTH = window.innerWidth;
        HEIGHT = window.innerHeight;

        renderer.setSize( WIDTH, HEIGHT );

        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();

    }

    function leapControl(frame) {

        //console.log('leap control', frame);

        updateFingerRepresentations(frame);

        doItemInteractions();

    }

    function updateFingerRepresentations(frame) {

        var numPointables = 0;

        if( frame.pointables != undefined && frame.pointables.length > 0 ) {

            var pointables = frame.pointables;

            numPointables = pointables.length;

            for( var i=0; i < numPointables; i++ ) {

                // Defaults

                var fingerPos = DEFAULT_FINGER_POS;
                var fingerRot = new THREE.Vector3(DEFAULT_FINGER_ROT.x, DEFAULT_FINGER_ROT.y, DEFAULT_FINGER_ROT.z);

                var pointable = pointables[i];

                var direction = pointable.direction;

                var vec = new THREE.Vector3(direction.x, direction.y, direction.z);

                var axis = new THREE.Vector3( 0, 1, 0 ).cross( vec );
                var radians = Math.acos( new THREE.Vector3( 0, 1, 0 ).dot( vec.clone().normalize() ) );
                var matrix = new THREE.Matrix4().makeRotationAxis( axis.normalize(), radians );

                fingerRot.setEulerFromRotationMatrix( matrix, THREE.Object3D.defaultEulerOrder );

                var tipPosition = pointable.tipPosition;

                if( tipPosition ) {

                    //console.log('tipPosition', tipPosition);

                    var x = tipPosition.x,
                            y = tipPosition.y,
                            z = tipPosition.z;

                    // Coordinates are millimetres from centre
                    // Number range is apparently: 290 to -290 for X, 14 to 720 for Y, 230 to -330 for Z
                    // According to:
                    // https://developer.leapmotion.com/forums/forums/10/topics/range-of-possible-values-via-js

                    // Just doing a rough translation to our 3D scene coordinates for now...

                    fingerPos = {x: x / 5, y: Math.max(0, (y-100) / 5), z: (z+10) / 5};

                }

                // XXX
                /*
                if( fingerPos.x != 0 || fingerPos.y != 0 || fingerPos.z != 0 ) {
                    console.log( 'fingerPos', fingerPos );
                    console.log( 'fingerRot', fingerRot );
                }
                */

                fingerModels[i].position.set( fingerPos.x, fingerPos.y, fingerPos.z );
                fingerModels[i].rotation.set( fingerRot.x, fingerRot.y, fingerRot.z );

                /*
                fingerModels[i].__dirtyPosition = true;
                fingerModels[i].__dirtyRotation = true;
                */

            }

        }

        // Reset fingers we don't have data for
        for( var j=numPointables; j < 10; j++ ) {

            var thisFingerModel = fingerModels[j];

            thisFingerModel.position.set( DEFAULT_FINGER_POS.x, DEFAULT_FINGER_POS.y, DEFAULT_FINGER_POS.z );
            thisFingerModel.rotation.set( DEFAULT_FINGER_ROT.x, DEFAULT_FINGER_ROT.y, DEFAULT_FINGER_ROT.z );

            /*
            thisFingerModel.__dirtyPosition = true;
            thisFingerModel.__dirtyRotation = true;
            */

        }

    }

    function doItemInteractions() {

        /*
         * Trying multi-finger control...
         */
        /*
        for( var i=0; i < fingerModels.length; i++ ) {

            var fingerModel = fingerModels[i];

            var fingerPos = fingerModel.position;

            if( fingerPos.x != OFF_SCREEN_VALUE ) {

                // Check for touching ducks

                for( var j=0; j < duckObjs.length; j++ ) {

                    var duckObj = duckObjs[j];
                    var duckPos = duckObj.model.position;

                    //console.log('fingerPos');
                    //console.log('duckObj');

                    var distBuffer = duckObj.weight * 1.5;

                    if( fingerPos.x >= duckPos.x - distBuffer &&
                        fingerPos.x <= duckPos.x + distBuffer &&
                        fingerPos.y >= duckPos.y - distBuffer &&
                        fingerPos.y <= duckPos.y + distBuffer &&
                        fingerPos.z >= duckPos.z - distBuffer &&
                        fingerPos.z <= duckPos.z + distBuffer ) {

                        // Touching
                        console.log('touching duck ' + j + ' with finger ', i);

                        duckObj.label.material.color.copy( textSelectedColour );

                        if( hoveredItems.indexOf( duckObj.weight ) ) {
                            hoveredItems.push( duckObj.weight );
                        }

                    }

                }


            }

        }
        */

        var fingerPos = fingerModels[0].position;

        // If no selected object
        if( selectedItem == undefined ) {

            var touchingItem = undefined;

            // Detect whether finger is over/under an object
            if( fingerPos.x != OFF_SCREEN_VALUE ) {

                // Check for touching ducks

                for( var j=0; j < duckObjs.length; j++ ) {

                    var duckObj = duckObjs[j];
                    var duckPos = duckObj.model.position;

                    //console.log('fingerPos');
                    //console.log('duckObj');

                    var distBuffer = Math.max( duckObj.weight * 1.5, 2 );

                    if( fingerPos.x >= duckPos.x - distBuffer &&
                            fingerPos.x <= duckPos.x + distBuffer &&
                            fingerPos.y >= duckPos.y - distBuffer &&
                            fingerPos.y <= duckPos.y + distBuffer &&
                            fingerPos.z >= duckPos.z - distBuffer &&
                            fingerPos.z <= duckPos.z + distBuffer ) {

                        // Touching
                        console.log('touching duck ' + j + ' with finger');

                        touchingItem = duckObj;
                        break;

                    }

                }

            }

            if( touchingItem != undefined ) {

                // If not already hovering over an object, start hover time
                if( hoveredItem == undefined ) {

                    hoveredItem = touchingItem;

                    // Highlight hovered object
                    updateHighlights();

                    console.log('hoveredObj', hoveredItem);

                    hoverTime = 0;

                } else {
                    // Already hovering an object

                    // If hovering this same object...
                    if( hoveredItem == touchingItem ) {

                        hoverTime++;

                        console.log(hoverTime);

                        // If hovered long enough, then select
                        if( hoverTime >= 10 ) {

                            console.log('Select!');

                            selectedItem = hoveredItem;
                            selectedItem.label.material.color.copy( textSelectedColour );


                            hoveredItem = undefined;
                            hoverTime = 0;

                            // Highlight selected object
                            updateHighlights();

                        }

                    } else {
                        // Now hovering a different object

                        hoveredItem = touchingItem;

                        hoveredItem.label.material.color.copy( textHoveredColour );

                        console.log('Reset hoveredObj', hoveredItem);

                        hoverTime = 0;

                    }

                }

            } else {
                // Not touching an object

                if( hoveredItem != undefined ) {

                    hoveredItem = undefined;
                    hoverTime = 0;

                    // Remove any hover/selected highlight
                    updateHighlights();

                }

            }

        } else {
            // Object already selected

            if( fingerPos.x != OFF_SCREEN_VALUE && fingerPos.z > 0 ) {

                //selectedItem.moveTo( fingerPos );

                //var labelXDiff = selectedItem.label.position.x - selectedItem.model.position.x;
                //var labelYDiff = selectedItem.label.position.y - selectedItem.model.position.y;

                selectedItem.model.position.x = fingerPos.x;
                selectedItem.model.position.y = fingerPos.y;
                selectedItem.model.position.z = fingerPos.z;

                selectedItem.model.__dirtyPosition = true;
                selectedItem.model.__dirtyRotation = true;

                /*
                selectedItem.label.position.x = fingerPos.x + labelXDiff;
                selectedItem.label.position.y = fingerPos.y - labelYDiff;
                selectedItem.label.position.z = fingerPos.z;
                */

                //selectedItem.label.__dirtyPosition = true;
                //selectedItem.label.__dirtyRotation = true;

            } else {

                // 'Drop' the object

                selectedItem.label.material.color.copy( textColour );
                selectedItem = undefined;

                // Remove selected highlight
                updateHighlights();

            }

        }

    }

    // Draw a line - useful for marking correct positions/axes when debugging
    function drawLine( startx, starty, startz, endx, endy, endz, lColor ) {

        if( lColor == undefined ) {
            lColor = new THREE.Color(0xffffff);
        }

        var mat = new THREE.LineBasicMaterial({
            color: lColor,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            transparent: true,
            linewidth: 5
        });

        var geom = new THREE.Geometry();

        geom.vertices.push(new THREE.Vector3(startx, starty, startz));
        geom.vertices.push(new THREE.Vector3(endx, endy, endz));

        this.drawingLine = new THREE.Line( geom , mat );

        scene.add( this.drawingLine );

    }

    function updateHighlights() {

        console.log('update highlights');

        /*
        for( var i=0; i < duckObjs.length; i++ ) {

            var duckObj = duckObjs[i];

            if( duckObj == selectedItem ) {
                duckObj.label.material.color.copy( textSelectedColour );

            } else if( duckObj == hoveredItem ) {
                duckObj.label.material.color.copy( textHoveredColour );

            } else {
                duckObj.label.material.color.copy( textColour );
            }

        }
        */

    }

    function checkLoadedAndConnected() {

        /*
        if( hasLoaded ) {
            $('#status').text('Loaded content').removeClass('text-info').addClass('text-success');
        }

        if( hasConnected ) {

            $('#connection').text('Leap Motion connected').addClass('text-success').removeClass('text-error');

        }

        if( hasLoaded && hasConnected ) {
            document.getElementById('go').style.display = 'inline-block';
        }
        */

    }

};
