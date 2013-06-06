var App = function() {

    var OFF_SCREEN_VALUE = -999;

    var indexFingerModel;

    var hoveredItem;
    var selectedItem;

    var hoverTime = 0;

    var weightItems = [];

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
        defaultDistance = 100;

    var CONTAINER_OPACITY_DEFAULT = 0;
    var CONTAINER_OPACITY_HOVER = 0.15;
    var CONTAINER_OPACITY_SELECTED = 0.3;

    var renderer,
        camera,
        scene;

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
        camera.position.z = defaultDistance;

        scene = new THREE.Scene();

        // Attach the renderer's canvas element to the container
        $('#container').append(renderer.domElement);

        loadItems();

        setupFingerRepresentation();

        // XXX
        /*
        test(5, 0, 0, 0);
        test(10, -10, -10, -10);
        test(20, 0, 20, -20);
        */

        setupBalance();

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

    function setupFingerRepresentation() {

        var sphereGeometry = new THREE.CylinderGeometry(5, 5, 20);

        indexFingerModel = new THREE.Mesh( sphereGeometry, new THREE.MeshBasicMaterial({color: 0x00CC00}) );

        // Set off-screen to start with
        //indexFingerModel.position.set(OFF_SCREEN_VALUE, 0, 0);

        indexFingerModel.position.set(0, 10, 0);

        indexFingerModel.rotation.x = Math.PI * -3/4;

        indexFingerModel.castShadow = true;

        console.log('adding to scene', indexFingerModel);

        scene.add( indexFingerModel );

    }

    /*
    function test(s, x, y, z) {

        var aGeometry = new THREE.CylinderGeometry(s, s, s);

        aModel = new THREE.Mesh( aGeometry, new THREE.MeshNormalMaterial() );

        // Set off-screen to start with
        //aModel.position.set(OFF_SCREEN_VALUE, 0, 0);

        aModel.position.set(x, y, z);

        //aModel.rotation.x = Math.PI * -3/4;

        aModel.castShadow = true;

        console.log('adding to scene', aModel);

        scene.add( aModel );

    }
    */

    function setupBalance() {

        loader.load('models/small-weight.js', function(geometry) {

            var weightMaterial = new THREE.MeshLambertMaterial( { color: 0x8a8181, ambient: 0xdadada,
                reflectivity: 0.3 } );

            var model = new THREE.Mesh( geometry, weightMaterial );

            model.scale.set(1.5, 1, 1.5);

            model.position.set( -15, -0.55, 10 );

            model.receiveShadow = true;

            scene.add( model );

        });

    }

    function setupLights() {

        // Lights

        var ambientLight = new THREE.AmbientLight( 0x777777 );
        scene.add( ambientLight );

        var spotLight = new THREE.SpotLight(0xFFFFFF, 3.0, 300);

        spotLight.position.set( 0, 150, 0 ); // x, y, z
        spotLight.target.position.set( 0, 0, 0 );
        spotLight.castShadow = true;
        spotLight.shadowDarkness = 0.2;

        scene.add( spotLight );

        // Set method that gets called with every Leap frame
        Leap.loop(update);

    }

    function start() {

        console.log('START');

        /*
        document.getElementById('welcome').style.display = 'none';
        document.getElementById('info').style.display = 'block';
        */

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

        render();

    }

    // Renders the frame and keeps the camera looking at the centre of the scene
    function render() {
        camera.lookAt( scene.position );
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

        updateFingerRepresentation(frame);

        doItemInteractions();

    }

    function updateFingerRepresentation(frame) {

        // Off-screen by default
        //var fingerPos = {x: OFF_SCREEN_VALUE, y: OFF_SCREEN_VALUE, z: OFF_SCREEN_VALUE};
        // XXX
        var fingerPos = {x: 0, y: 0, z: 0};

        //console.log('frame.pointables', frame.pointables);

        if( frame.pointables != undefined && frame.pointables.length > 0 ) {

            var pointables = frame.pointables;

            if( pointables.length > 0 ) {

                var pointable = pointables[0];

                //console.log(pointable);

                var direction = pointable.direction;

                console.log('direction', direction);
                console.log('direction angleTo', direction.angleTo);

                var vec = new THREE.Vector3(direction.x, direction.y, direction.z);

                /*
                indexFingerModel.rotation.y = direction.x * Math.PI;
                indexFingerModel.rotation.z = direction.y * Math.PI;
                indexFingerModel.rotation.x = direction.z * Math.PI;
                */

                // XXX
                var axis = new THREE.Vector3( 0, 1, 0 ).crossSelf( vec );

                var radians = Math.acos( new THREE.Vector3( 0, 1, 0 ).dot( vec.clone().normalize() ) );

                var matrix = new THREE.Matrix4().makeRotationAxis( axis.normalize(), radians );

                indexFingerModel.rotation.setEulerFromRotationMatrix( matrix, THREE.Object3D.defaultEulerOrder );

                console.log('rotation', indexFingerModel.rotation);

                // XXX


                var tipPosition = pointable.tipPosition;

                if( tipPosition ) {

                    console.log('tipPosition', tipPosition);

                    //console.log(tipPosition);

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
            }

        }

        //console.log('finger pos', fingerPos.x, fingerPos.y, fingerPos.z);

        if( fingerPos.x != 0 || fingerPos.y != 0 || fingerPos.z != 0 ) {
            console.log('fingerPos', fingerPos);
        }

        indexFingerModel.position.set(fingerPos.x, fingerPos.y, fingerPos.z);

        /*
        if( fingerPos.y >= ON_TRAY_Y ) {
            indexFingerModel.material.color = new THREE.Color(0x00CC00);
        } else {
            indexFingerModel.material.color = new THREE.Color(0xCC0000);
        }
        */

        // JS SDK doesn't appear to give us the finger rotation yet...
        //indexFingerModel.rotation.set(...);

    }

    function doItemInteractions() {

        var fingerPos = indexFingerModel.position;

        // If no selected object
        if( selectedItem == undefined ) {

            var touchingItem = undefined;

            /*
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
                    for( var j=0; j < weightItems.length; j++ ) {

                        var trayItem = weightItems[j];

                        if( trayItem.containerModel == collision.object ) {

                            touchingItem = trayItem;
                            break;

                        }
                    }

                }

            }
            */

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

        for( var i=0; i < weightItems.length; i++ ) {

            var trayItem = weightItems[i];

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

    }

    function getAllItemsContainerObjects() {

        var containerObjects = [];

        for( var i=0; i < weightItems.length; i++ ) {
            var trayItem = weightItems[i];
            containerObjects.push(trayItem.containerModel);
        }

        return containerObjects;

    }

    function loadItems() {

        /*
        $.getJSON('data/objects.json', function(data) {

            $.each(data, function(key, val) {

                var trayItem = new TrayItem(key, val);

                weightItems.push(trayItem);

            });

            for( var i=0; i < weightItems.length; i++ ) {
                loadModel( weightItems[i] );
            }

        });
        */

    }

    function repositionItems() {

        // TODO

        /*
        $.getJSON('data/objects.json', function(data) {

            for( var i=0; i < weightItems.length; i++ ) {

                var weightItem = weightItems[i];

                weightItem.moveTo( {x: data[weightItem.id].objectProps.x,
                    y: ON_TRAY_Y,
                    z: data[weightItem.id].objectProps.z} );

            }

        });
        */

    }

    function loadModel( weightItem ) {

        var filepath = 'models/'+weightItem.id+'/'+weightItem.id+'.js';

        // TODO container
        /*
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
        */

        loader.load(filepath, function(geometry, materials) {

            var material = new THREE.MeshFaceMaterial(materials);

            /*
            if( objectProps.replaceMaterial ) {
            */
                material = new THREE.MeshLambertMaterial( { color: 0x393939, ambient: 0x9b9b9b,
                    reflectivity: 0.3 } );
            /*
            }
            */

            var model = new THREE.Mesh( geometry, material );

            /*
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
            */

            model.castShadow = true;

            scene.add( model );

            console.log('After adding model:', weightItems);

            modelLoaded();

        });

    }

    function modelLoaded() {

        numLoadedModels++;

        if( numLoadedModels >= weightItems.length ) {
            hasLoaded = true;
        }

        checkLoadedAndConnected();

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
