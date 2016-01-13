/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Tool
 *
 * @class The Tool object refers to a script that the user can interact with by
 *     using the mouse and keyboard and can be accessed through the global
 *     `tool` variable. All its properties are also available in the paper
 *     scope.
 *
 * The global `tool` variable only exists in scripts that contain mouse handler
 * functions ({@link #onMouseMove}, {@link #onMouseDown}, {@link #onMouseDrag},
 * {@link #onMouseUp}) or a keyboard handler function ({@link #onKeyDown},
 * {@link #onKeyUp}).
 *
 * @classexample
 * var path;
 *
 * // Only execute onMouseDrag when the mouse
 * // has moved at least 10 points:
 * tool.distanceThreshold = 10;
 *
 * tool.onMouseDown = function(event) {
 *     // Create a new path every time the mouse is clicked
 *     path = new Path();
 *     path.add(event.point);
 *     path.strokeColor = 'black';
 * }
 *
 * tool.onMouseDrag = function(event) {
 *     // Add a point to the path every time the mouse is dragged
 *     path.add(event.point);
 * }
 */
var Tool = PaperScopeItem.extend(/** @lends Tool# */{
    _class: 'Tool',
    _list: 'tools',
    _reference: 'tool',
    _events: [ 'onActivate', 'onDeactivate', 'onEditOptions',
            'onMouseDown', 'onMouseUp', 'onMouseDrag', 'onMouseMove',
            'onKeyDown', 'onKeyUp' ],

    // DOCS: rewrite Tool constructor explanation
    initialize: function Tool(props) {
        PaperScopeItem.call(this);
        this._firstMove = true;
        this._count = 0;
        this._downCount = 0;
        this._set(props);
    },

    /**
     * Activates this tool, meaning {@link PaperScope#tool} will
     * point to it and it will be the one that receives tool events.
     *
     * @name Tool#activate
     * @function
     */

    /**
     * Removes this tool from the {@link PaperScope#tools} list.
     *
     * @name Tool#remove
     * @function
     */

    /**
     * The minimum distance the mouse has to drag before firing the onMouseDrag
     * event, since the last onMouseDrag event.
     *
     * @bean
     * @type Number
     */
    getMinDistance: function() {
        return this._minDistance;
    },

    setMinDistance: function(minDistance) {
        this._minDistance = minDistance;
        if (minDistance != null && this._maxDistance != null
                && minDistance > this._maxDistance) {
            this._maxDistance = minDistance;
        }
    },

    /**
     * The maximum distance the mouse has to drag before firing the onMouseDrag
     * event, since the last onMouseDrag event.
     *
     * @bean
     * @type Number
     */
    getMaxDistance: function() {
        return this._maxDistance;
    },

    setMaxDistance: function(maxDistance) {
        this._maxDistance = maxDistance;
        if (this._minDistance != null && maxDistance != null
                && maxDistance < this._minDistance) {
            this._minDistance = maxDistance;
        }
    },

    // DOCS: document Tool#fixedDistance
    /**
     * @bean
     * @type Number
     */
    getFixedDistance: function() {
        return this._minDistance == this._maxDistance
            ? this._minDistance : null;
    },

    setFixedDistance: function(distance) {
        this._minDistance = this._maxDistance = distance;
    },

    /**
     * {@grouptitle Mouse Event Handlers}
     *
     * The function to be called when the mouse button is pushed down. The
     * function receives a {@link ToolEvent} object which contains information
     * about the tool event.
     *
     * @name Tool#onMouseDown
     * @property
     * @type Function
     *
     * @example {@paperscript}
     * // Creating circle shaped paths where the user presses the mouse button:
     * tool.onMouseDown = function(event) {
     *     // Create a new circle shaped path with a radius of 10
     *     // at the position of the mouse (event.point):
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     * }
     */

    /**
     * The function to be called when the mouse position changes while the mouse
     * is being dragged. The function receives a {@link ToolEvent} object which
     * contains information about the tool event.
     *
     * @name Tool#onMouseDrag
     * @property
     * @type Function
     *
     * @example {@paperscript}
     * // Draw a line by adding a segment to a path on every mouse drag event:
     *
     * // Create an empty path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * tool.onMouseDrag = function(event) {
     *     // Add a segment to the path at the position of the mouse:
     *     path.add(event.point);
     * }
     */

    /**
     * The function to be called the mouse moves within the project view. The
     * function receives a {@link ToolEvent} object which contains information
     * about the tool event.
     *
     * @name Tool#onMouseMove
     * @property
     * @type Function
     *
     * @example {@paperscript}
     * // Moving a path to the position of the mouse:
     *
     * // Create a circle shaped path with a radius of 10 at {x: 0, y: 0}:
     * var path = new Path.Circle({
     *     center: [0, 0],
     *     radius: 10,
     *     fillColor: 'black'
     * });
     *
     * tool.onMouseMove = function(event) {
     *     // Whenever the user moves the mouse, move the path
     *     // to that position:
     *     path.position = event.point;
     * }
     */

    /**
     * The function to be called when the mouse button is released. The function
     * receives a {@link ToolEvent} object which contains information about the
     * tool event.
     *
     * @name Tool#onMouseUp
     * @property
     * @type Function
     *
     * @example {@paperscript}
     * // Creating circle shaped paths where the user releases the mouse:
     * tool.onMouseUp = function(event) {
     *     // Create a new circle shaped path with a radius of 10
     *     // at the position of the mouse (event.point):
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     * }
     */

    /**
     * {@grouptitle Keyboard Event Handlers}
     *
     * The function to be called when the user presses a key on the keyboard.
     * The function receives a {@link KeyEvent} object which contains
     * information about the keyboard event.
     *
     * If the function returns `false`, the keyboard event will be prevented
     * from bubbling up. This can be used for example to stop the window from
     * scrolling, when you need the user to interact with arrow keys.
     *
     * @name Tool#onKeyDown
     * @property
     * @type Function
     *
     * @example {@paperscript}
     * // Scaling a path whenever the user presses the space bar:
     *
     * // Create a circle shaped path:
     *     var path = new Path.Circle({
     *         center: new Point(50, 50),
     *         radius: 30,
     *         fillColor: 'red'
     *     });
     *
     * tool.onKeyDown = function(event) {
     *     if (event.key == 'space') {
     *         // Scale the path by 110%:
     *         path.scale(1.1);
     *
     *         // Prevent the key event from bubbling
     *         return false;
     *     }
     * }
     */

    /**
     * The function to be called when the user releases a key on the keyboard.
     * The function receives a {@link KeyEvent} object which contains
     * information about the keyboard event.
     *
     * If the function returns `false`, the keyboard event will be prevented
     * from bubbling up. This can be used for example to stop the window from
     * scrolling, when you need the user to interact with arrow keys.
     *
     * @name Tool#onKeyUp
     * @property
     * @type Function
     *
     * @example
     * tool.onKeyUp = function(event) {
     *     if (event.key == 'space') {
     *         console.log('The spacebar was released!');
     *     }
     * }
     */

    _updateEvent: function(type, point, minDistance, maxDistance, start,
            needsChange, matchMaxDistance) {
        if (!start) {
            if (minDistance != null || maxDistance != null) {
                var minDist = minDistance != null ? minDistance : 0,
                    vector = point.subtract(this._point),
                    distance = vector.getLength();
                if (distance < minDist)
                    return false;
                // Produce a new point on the way to point if point is further
                // away than maxDistance
                if (maxDistance != null && maxDistance !== 0) {
                    if (distance > maxDistance) {
                        point = this._point.add(vector.normalize(maxDistance));
                    } else if (matchMaxDistance) {
                        return false;
                    }
                }
            }
            if (needsChange && point.equals(this._point))
                return false;
        }
        // Make sure mousemove events have lastPoint set even for the first move
        // so event.delta is always defined for them.
        // TODO: Decide whether mousedown also should always have delta set.
        this._lastPoint = start && type == 'mousemove' ? point : this._point;
        this._point = point;
        switch (type) {
        case 'mousedown':
            this._lastPoint = this._downPoint;
            this._downPoint = this._point;
            this._downCount++;
            break;
        case 'mouseup':
            // Mouse up events return the down point for last point, so delta is
            // spanning over the whole drag.
            this._lastPoint = this._downPoint;
            break;
        }
        this._count = start ? 0 : this._count + 1;
        return true;
    },

    _handleEvent: function(type, event, point) {
        // Update global reference to this scope.
        paper = this._scope;
        // Now handle event callbacks
        var tool = this,
            called = false,
            drag = false;

        function emit() {
            called = tool.responds(type) &&
                    tool.emit(type, new ToolEvent(tool, type, event)) || called;
        }

        switch (type) {
        case 'mousedown':
            this._updateEvent(type, point, null, null, true, false, false);
            emit();
            break;
        case 'mouseup':
            this._updateEvent(type, point, null, this.maxDistance, false,
                    false, false);
            emit();
            // Start with new values for 'mousemove'
            this._updateEvent(type, point, null, null, true, false, false);
            this._firstMove = true;
            break;
        case 'mousedrag':
            // If there is no mousedrag event installed, fall back to mousemove,
            // with which we share the actual event handling code anyhow.
            if (!(drag = this.responds(type)))
                type = 'mousemove';
            // Fall through to the shared event handling code below:
            /* jshint -W086 */
        case 'mousemove':
            // In order for idleInterval drag events to work, we need to not
            // check the first call for a change of position. Subsequent calls
            // required by min/maxDistance functionality will require it,
            // otherwise this might loop endlessly.
            var needsChange = !drag,
                // If the mouse is moving faster than maxDistance, do not
                // produce events for what is left after the first event is
                // generated in case it is shorter than maxDistance, as this
                // would produce weird results. matchMaxDistance controls this.
                matchMaxDistance = false;
            while (this._updateEvent(type, point, this.minDistance,
                    this.maxDistance, !drag && this._firstMove, needsChange,
                    matchMaxDistance)) {
                emit();
                if (drag) {
                    needsChange = matchMaxDistance = true;
                } else {
                    this._firstMove = false;
                }
            }
            break;
        }
        // Prevent default if mouse event was handled.
        if (called)
            event.preventDefault();
        return called;
    }
    /**
     * {@grouptitle Event Handling}
     *
     * Attach an event handler to the tool.
     *
     * @name Tool#on
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @param {Function} function the function to be called when the event
     *     occurs, receiving a {@link ToolEvent} object as its sole argument
     * @return {Tool} this tool itself, so calls can be chained
     */
    /**
     * Attach one or more event handlers to the tool.
     *
     * @name Tool#on
     * @function
     * @param {Object} param an object literal containing one or more of the
     *     following properties: {@values mousedown, mouseup, mousedrag,
     *     mousemove, keydown, keyup}
     * @return {Tool} this tool itself, so calls can be chained
     */

    /**
     * Detach an event handler from the tool.
     *
     * @name Tool#off
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @param {Function} function the function to be detached
     * @return {Tool} this tool itself, so calls can be chained
     */
    /**
     * Detach one or more event handlers from the tool.
     *
     * @name Tool#off
     * @function
     * @param {Object} param an object literal containing one or more of the
     *     following properties: {@values mousedown, mouseup, mousedrag,
     *     mousemove, keydown, keyup}
     * @return {Tool} this tool itself, so calls can be chained
     */

    /**
     * Emit an event on the tool.
     *
     * @name Tool#emit
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @param {Object} event an object literal containing properties describing
     * the event
     * @return {Boolean} {@true if the event had listeners}
     */

    /**
     * Check if the tool has one or more event handlers of the specified type.
     *
     * @name Tool#responds
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @return {Boolean} {@true if the tool has one or more event handlers of
     * the specified type}
     */
});
