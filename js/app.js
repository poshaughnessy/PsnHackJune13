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
        defaultDistance = 70;

    var CONTAINER_OPACITY_DEFAULT = 0.2; // XXX Put back to 0
    var CONTAINER_OPACITY_HOVER = 0.15;
    var CONTAINER_OPACITY_SELECTED = 0.3;

    var render, renderer, scene, camera, box, box2, box_material, table,
            table_material, balance, balance_material,
            plinth, plinth_material, plinth_geometry;

    var duck1, duck2;

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
        camera.position.y = 50;
        camera.position.z = defaultDistance;

        camera.lookAt( new THREE.Vector3(0,0,0) );

        // Attach the renderer's canvas element to the container
        $('#container').append(renderer.domElement);

        setupPhysicsAndScene();

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

    function setupFingerRepresentations() {

        for( var i=0; i < 10; i++ ) {

            var sphereGeometry = new THREE.CylinderGeometry(5, 5, 20);

            /*
            var fingerModel = new Physijs.CylinderMesh( sphereGeometry, new THREE.MeshLambertMaterial({color: FINGER_COLOURS[i],
                ambient: 0xdadada}) );
            */

            var fingerModel = new THREE.Mesh( sphereGeometry, new THREE.MeshLambertMaterial({color: FINGER_COLOURS[i],
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

    function setupWeight() {

        loader.load('models/small-weight.js', function(geometry) {

            var weightMaterial = new THREE.MeshLambertMaterial( { color: 0x8a8181, ambient: 0xdadada,
                reflectivity: 0.3 } );

            var model = new Physijs.BoxMesh( geometry, weightMaterial, 10 );

            model.scale.set(1.5, 1.5, 1.5);

            model.position.set( 0, 50, 30 );

            model.receiveShadow = true;

            scene.add( model );

        });

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
                new THREE.CubeGeometry(80, 1, 80),
                table_material,
                0, // mass
                { restitution: .2, friction: .8 }
        );
        table.position.y = -.5;
        table.receiveShadow = true;
        scene.add( table );

        // Balance
        balance_material = Physijs.createMaterial(
                new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/wood.jpg' ), ambient: 0xFFFFFF }),
                0, // no friction
                0 // no restitution
        );

        balance = new Physijs.ConeMesh(
                new THREE.CylinderGeometry(1, 10, 20, 20, 20, false),
                balance_material,
                0 // mass
        );
        scene.add( balance );

        // Plinth
        plinth_material = Physijs.createMaterial(
                new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/plywood.jpg' ), ambient: 0xFFFFFF }),
                .5, // medium friction
                1 // high restitution
        );
        plinth_material.map.wrapS = plinth_material.map.wrapT = THREE.RepeatWrapping;
        plinth_material.map.repeat.set( 1, .5 );
        plinth_geometry = new THREE.CubeGeometry( 50, 1, 10 );
        plinth = new Physijs.BoxMesh( plinth_geometry, plinth_material, 1);
        plinth.position.y = 10.5;
        plinth.receiveShadow = true;
        plinth.castShadow = true;
        scene.add( plinth );

        /*
        // Box
        box_material = Physijs.createMaterial(
                new THREE.MeshLambertMaterial({ map: THREE.ImageUtils.loadTexture( 'images/wood.jpg' ), ambient: 0xFFFFFF }),
                1, // high friction
                .1 // low restitution
        );

        box = new Physijs.BoxMesh(
                new THREE.CubeGeometry( 5, 5, 5 ),
                box_material,
                5 // mass
        );
        box.position.y = 20;
        box.position.x = 10;
        box.castShaddow = true;
        scene.add( box );

        // Second box
        box2 = new Physijs.BoxMesh(
                new THREE.CubeGeometry( 5, 5, 5 ),
                box_material,
                5 // mass
        );
        box2.position.y = 20;
        box2.position.x = -10;
        //box2.position.z = 1;
        box.castShaddow = true;
        scene.add( box2 );
        */

        // Duck 1
        loader.load('models/RubberDucky.js', function(geometry, materials) {

            //var material = new THREE.MeshFaceMaterial(materials);

            var material = new THREE.MeshBasicMaterial({color: 0xFFFF66});

            var model = new Physijs.BoxMesh( geometry, material, 5 );

            model.scale.set(2, 2, 2);

            model.position.set( 10, 20, 0 );

            model.rotation.y = -Math.PI * 3/4;

            //model.castShadow = true;
            model.receiveShadow = true;

            scene.add( model );

        });

        // Duck 2
        loader.load('models/RubberDucky.js', function(geometry, materials) {

            //var material = new THREE.MeshFaceMaterial(materials);

            var material = new THREE.MeshBasicMaterial({color: 0xFFFF66});

            var model = new Physijs.BoxMesh( geometry, material, 5 );

            model.scale.set(2, 2, 2);

            model.position.set( -10, 20, 0 );

            model.rotation.y = -Math.PI * 3/4;

            //model.castShadow = true;
            model.receiveShadow = true;

            scene.add( model );


        });

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
        scene.simulate();

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

                    console.log('tipPosition', tipPosition);

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
                if( fingerPos.x != 0 || fingerPos.y != 0 || fingerPos.z != 0 ) {
                    console.log( 'fingerPos', fingerPos );
                    console.log( 'fingerRot', fingerRot );
                }

                fingerModels[i].position.set( fingerPos.x, fingerPos.y, fingerPos.z );
                fingerModels[i].rotation.set( fingerRot.x, fingerRot.y, fingerRot.z );

            }

        }

        // Reset fingers we don't have data for
        for( var j=numPointables; j < 10; j++ ) {

            fingerModels[j].position.set( DEFAULT_FINGER_POS.x, DEFAULT_FINGER_POS.y, DEFAULT_FINGER_POS.z );
            fingerModels[j].rotation.set( DEFAULT_FINGER_ROT.x, DEFAULT_FINGER_ROT.y, DEFAULT_FINGER_ROT.z );

        }

    }

    function doItemInteractions() {

        /*
        var fingerPos = indexFingerModel.position;

        // If no selected object
        if( selectedItem == undefined ) {

            var touchingItem = undefined;

            // Detect whether finger is over/under an object
            if( fingerPos.x != OFF_SCREEN_VALUE && fingerPos.y >= ON_TRAY_Y ) {

                var vector = fingerPos.clone().subSelf( camera.position );

                //console.log('vector', vector);

                var ray = new THREE.Raycaster( camera.position, vector.normalize(), NEAR, FAR );

                var containerObjects = getAllItemsContainerObjects();

                var collisions = ray.intersectObjects( containerObjects );

                // If the ray collides with an object, i.e. if finger is over/above an object
                if( collisions.length > 0 ) {

                    var collision = collisions[0];

                    // Identify the collision object
                    for( var j=0; j < items.length; j++ ) {

                        var trayItem = items[j];

                        if( trayItem.containerModel == collision.object ) {

                            touchingItem = trayItem;
                            break;

                        }
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
                        if( hoverTime >= 50 ) {

                            console.log('Select!');

                            selectedItem = hoveredItem;
                            selectedItem.containerModel.material.opacity = CONTAINER_OPACITY_SELECTED;

                            hoveredItem = undefined;
                            hoverTime = 0;

                            // Highlight selected object
                            updateHighlights();

                        }

                    } else {
                        // Now hovering a different object

                        hoveredItem = touchingItem;
                        hoveredItem.containerModel.material.opacity = CONTAINER_OPACITY_HOVER;

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

            if( fingerPos.x != OFF_SCREEN_VALUE && fingerPos.y >= ON_TRAY_Y ) {

                selectedItem.moveTo( fingerPos );

            } else {

                // 'Drop' the object

                selectedItem.containerModel.material.opacity = CONTAINER_OPACITY_DEFAULT;
                selectedItem = undefined;

                // Remove selected highlight
                updateHighlights();

            }

        }
        */

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
        for( var i=0; i < items.length; i++ ) {

            var trayItem = items[i];

            if( trayItem.modelsSet ) {

                // Reset colour in case we changed it to red for a hint
                trayItem.containerModel.material.color = new THREE.Color(0x00CC00);

                if( trayItem == selectedItem ) {
                    trayItem.containerModel.material.opacity = CONTAINER_OPACITY_SELECTED;

                } else if( trayItem == hoveredItem ) {
                    trayItem.containerModel.material.opacity = CONTAINER_OPACITY_HOVER;

                } else {
                    trayItem.containerModel.material.opacity = CONTAINER_OPACITY_DEFAULT;
                }

            }

        }
        */

    }

    function getAllItemsContainerObjects() {

        var containerObjects = [];

        for( var i=0; i < items.length; i++ ) {
            var trayItem = items[i];
            containerObjects.push(trayItem.containerModel);
        }

        return containerObjects;

    }

    function loadItems() {

        /*
        $.getJSON('data/objects.json', function(data) {

            $.each(data, function(key, val) {

                var trayItem = new TrayItem(key, val);

                items.push(trayItem);

            });

            for( var i=0; i < items.length; i++ ) {
                loadModel( items[i] );
            }

        });
        */

        loadItem('RubberDucky',
                {
                    width: 10,
                    height: 10,
                    depth: 10,
                    x: 0,
                    y: 10,
                    z: 20,
                    scale: 5,
                    rotation: {x: 0, y: -Math.PI * 3/4, z: 0}
                });

    }

    function loadItem(id, props) {

        loader.load('models/'+id+'.js', function(geometry, materials) {

            //var material = new THREE.MeshFaceMaterial(materials);

            var material = new THREE.MeshBasicMaterial({color: 0xFFFF66});

            var model = new Physijs.BoxMesh( geometry, material, 1 );

            model.scale.set(props.scale, props.scale, props.scale);

            model.position.set( props.x, props.y, props.z );

            model.rotation.set( props.rotation.x, props.rotation.y, props.rotation.z );

            model.receiveShadow = true;

            scene.add( model );


            // Create a simple container object for collision detection purposes

            /*
            var containerGeo = new THREE.CubeGeometry(props.width, props.height, props.depth);

            var container = new Physijs.BoxMesh( containerGeo,
                    new THREE.MeshLambertMaterial({color: 0x00FF00, transparent: true}));

            container.material.opacity = CONTAINER_OPACITY_DEFAULT;

            container.position.set( props.x, props.y, props.z );

            scene.add(container);
            */

            modelLoaded();

        });

    }

    function repositionItems() {

        // TODO

        /*
        $.getJSON('data/objects.json', function(data) {

            for( var i=0; i < items.length; i++ ) {

                var weightItem = items[i];

                weightItem.moveTo( {x: data[weightItem.id].objectProps.x,
                    y: ON_TRAY_Y,
                    z: data[weightItem.id].objectProps.z} );

            }

        });
        */

    }

    /*
    function loadModel( weightItem ) {

        var filepath = 'models/'+weightItem.id+'/'+weightItem.id+'.js';

        // TODO container
        *//*
        var objectProps = weightItem.objectProps;
        var containerProps = weightItem.containerProps;

        // Create a simple container object for collision detection purposes

        var containerGeo = new THREE.CubeGeometry(containerProps.width, containerProps.height, containerProps.depth);

        var container = new THREE.Mesh( containerGeo,
                new THREE.MeshLambertMaterial({color: 0x00FF00, transparent: true}));

        container.material.opacity = CONTAINER_OPACITY_DEFAULT;

        if( containerProps.rotationX ){
            container.rotation.x = containerProps.rotationX;
        }
        if( containerProps.rotationY ){
            container.rotation.y = containerProps.rotationY;
        }

        container.position.set( containerProps.x, 0, containerProps.z );

        scene.add(container);
        *//*

        loader.load(filepath, function(geometry, materials) {

            var material = new THREE.MeshFaceMaterial(materials);

            *//*
            if( objectProps.replaceMaterial ) {
            *//*
                material = new THREE.MeshLambertMaterial( { color: 0x393939, ambient: 0x9b9b9b,
                    reflectivity: 0.3 } );
            *//*
            }
            *//*

            var model = new THREE.Mesh( geometry, material );

            *//*
            model.position.set(objectProps.x, 0, objectProps.z);
            if( objectProps.rotationX ){
                model.rotation.x = objectProps.rotationX;
            }
            if( objectProps.rotationY ){
                model.rotation.y = objectProps.rotationY;
            }
            if( objectProps.scale ) {
                model.scale.set(objectProps.scale, objectProps.scale, objectProps.scale);
            }
            *//*

            model.castShadow = true;

            scene.add( model );

            console.log('After adding model:', items);

            modelLoaded();

        });

    }
    */

    function modelLoaded() {

        /*
        numLoadedModels++;

        if( numLoadedModels >= items.length ) {
            hasLoaded = true;
        }

        checkLoadedAndConnected();
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
