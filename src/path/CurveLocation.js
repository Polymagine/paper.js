/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name CurveLocation
 *
 * @class CurveLocation objects describe a location on {@link Curve}
 * objects, as defined by the curve {@link #parameter}, a value between
 * {@code 0} (beginning of the curve) and {@code 1} (end of the curve). If
 * the curve is part of a {@link Path} item, its {@link #index} inside the
 * {@link Path#curves} array is also provided.
 *
 * The class is in use in many places, such as
 * {@link Path#getLocationAt(offset, isParameter)},
 * {@link Path#getLocationOf(point)},
 * {@link Path#getNearestLocation(point),
 * {@link PathItem#getIntersections(path)},
 * etc.
 */
var CurveLocation = Base.extend(/** @lends CurveLocation# */{
    _class: 'CurveLocation',
    // Enforce creation of beans, as bean getters have hidden parameters.
    // See #getSegment() below.
    beans: true,

    // DOCS: CurveLocation class description: add these back when the  mentioned
    // functioned have been added: {@link Path#split(location)}
    /**
     * Creates a new CurveLocation object.
     *
     * @param {Curve} curve
     * @param {Number} parameter
     * @param {Point} [point]
     */
    initialize: function CurveLocation(curve, parameter, point,
            _distance, _overlap, _intersection) {
        // Merge intersections very close to the end of a curve to the
        // beginning of the next curve.
        if (parameter >= 1 - /*#=*/Numerical.CURVETIME_EPSILON) {
            var next = curve.getNext();
            if (next) {
                parameter = 0;
                curve = next;
            }
        }
        // Define this CurveLocation's unique id.
        // NOTE: We do not use the same pool as the rest of the library here,
        // since this is only required to be unique at runtime among other
        // CurveLocation objects.
        this._id = UID.get(CurveLocation);
        this._setCurve(curve);
        this._parameter = parameter;
        this._point = point || curve.getPointAt(parameter, true);
        this._distance = _distance;
        this._overlap = _overlap;
        this._crossing = null;
        this._intersection = _intersection;
        if (_intersection) {
            _intersection._intersection = this;
            // TODO: Remove this once debug logging is removed.
            _intersection._other = true;
        }
    },

    _setCurve: function(curve) {
        var path = curve._path;
        this._version = path ? path._version : 0;
        this._curve = curve;
        this._segment = null; // To be determined, see #getSegment()
        // Also store references to segment1 and segment2, in case path
        // splitting / dividing is going to happen, in which case the segments
        // can be used to determine the new curves, see #getCurve(true)
        this._segment1 = curve._segment1;
        this._segment2 = curve._segment2;
    },

    /**
     * The segment of the curve which is closer to the described location.
     *
     * @type Segment
     * @bean
     */
    getSegment: function() {
        // Request curve first, so _segment gets invalidated if it's out of sync
        var curve = this.getCurve(),
            segment = this._segment;
        if (!segment) {
            var parameter = this.getParameter();
            if (parameter === 0) {
                segment = curve._segment1;
            } else if (parameter === 1) {
                segment = curve._segment2;
            } else if (parameter != null) {
                // Determine the closest segment by comparing curve lengths
                segment = curve.getPartLength(0, parameter)
                    < curve.getPartLength(parameter, 1)
                        ? curve._segment1
                        : curve._segment2;
            }
            this._segment = segment;
        }
        return segment;
    },

    /**
     * The curve that this location belongs to.
     *
     * @type Curve
     * @bean
     */
    getCurve: function() {
        var curve = this._curve,
            path = curve && curve._path,
            that = this;
        if (path && path._version !== this._version) {
            // If the path's segments have changed in the meantime, clear the
            // internal _parameter value and force refetching of the correct
            // curve again here.
            curve = this._parameter = this._curve = null;
        }

        // If path is out of sync, access current curve objects through segment1
        // / segment2. Since path splitting or dividing might have happened in
        // the meantime, try segment1's curve, and see if _point lies on it
        // still, otherwise assume it's the curve before segment2.
        function trySegment(segment) {
            var curve = segment && segment.getCurve();
            if (curve && (that._parameter = curve.getParameterOf(that._point))
                    != null) {
                // Fetch path again as it could be on a new one through split()
                that._setCurve(curve);
                that._segment = segment;
                return curve;
            }
        }

        return curve
            || trySegment(this._segment)
            || trySegment(this._segment1)
            || trySegment(this._segment2.getPrevious());
    },

    /**
     * The path this curve belongs to, if any.
     *
     * @type Item
     * @bean
     */
    getPath: function() {
        var curve = this.getCurve();
        return curve && curve._path;
    },

    /**
     * The index of the curve within the {@link Path#curves} list, if the
     * curve is part of a {@link Path} item.
     *
     * @type Index
     * @bean
     */
    getIndex: function() {
        var curve = this.getCurve();
        return curve && curve.getIndex();
    },

    /**
     * The curve parameter, as used by various bezier curve calculations. It is
     * value between {@code 0} (beginning of the curve) and {@code 1} (end of
     * the curve).
     *
     * @type Number
     * @bean
     */
    getParameter: function() {
        var curve = this.getCurve(),
            parameter = this._parameter;
        return curve && parameter == null
            ? this._parameter = curve.getParameterOf(this._point)
            : parameter;
    },

    /**
     * The point which is defined by the {@link #curve} and
     * {@link #parameter}.
     *
     * @type Point
     * @bean
     */
    getPoint: function() {
        return this._point;
    },

    /**
     * The length of the path from its beginning up to the location described
     * by this object. If the curve is not part of a path, then the length
     * within the curve is returned instead.
     *
     * @type Number
     * @bean
     */
    getOffset: function() {
        var path = this.getPath();
        return path ? path._getOffset(this) : this.getCurveOffset();
    },

    /**
     * The length of the curve from its beginning up to the location described
     * by this object.
     *
     * @type Number
     * @bean
     */
    getCurveOffset: function() {
        var curve = this.getCurve(),
            parameter = this.getParameter();
        return parameter != null && curve && curve.getPartLength(0, parameter);
    },

    /**
     * The curve location on the intersecting curve, if this location is the
     * result of a call to {@link PathItem#getIntersections(path)} /
     * {@link Curve#getIntersections(curve)}.
     *
     * @type CurveLocation
     * @bean
     */
    getIntersection: function() {
        return this._intersection;
    },

    /**
     * The tangential vector to the {@link #curve} at the given location.
     *
     * @name Item#tangent
     * @type Point
     */

    /**
     * The normal vector to the {@link #curve} at the given location.
     *
     * @name Item#normal
     * @type Point
     */

    /**
     * The curvature of the {@link #curve} at the given location.
     *
     * @name Item#curvature
     * @type Number
     */

    /**
     * The distance from the queried point to the returned location.
     *
     * @type Number
     * @bean
     * @see Curve#getNearestLocation(point)
     * @see Path#getNearestLocation(point)
     */
    getDistance: function() {
        return this._distance;
    },

    // DOCS: divide(), split()

    divide: function() {
        var curve = this.getCurve();
        return curve && curve.divide(this.getParameter(), true);
    },

    split: function() {
        var curve = this.getCurve();
        return curve && curve.split(this.getParameter(), true);
    },

    isCrossing: function(_report) {
        // Implementation based on work by Andy Finnell:
        // http://losingfight.com/blog/2011/07/09/how-to-implement-boolean-operations-on-bezier-paths-part-3/
        // https://bitbucket.org/andyfinnell/vectorboolean
        var intersection = this._intersection,
            crossing = this._crossing;
        if (crossing != null || !intersection)
            return crossing || false;
        // TODO: isTangent() ?
        // TODO: isAtEndPoint() ?
        // -> Return if it's a tangent, or if not at an end point, only end
        // point intersections need more checking!
        // Values for getTangentAt() that are almost 0 and 1.
        // NOTE: Even though getTangentAt() has code to support 0 and 1 instead
        // of tMin and tMax, we still need to use this instead, as other issues
        // emerge from switching to 0 and 1 in edge cases.
        // NOTE: VectorBoolean has code that slowly shifts these points inwards
        // until the resulting tangents are not ambiguous. Do we need this too?
        var tMin = /*#=*/Numerical.CURVETIME_EPSILON,
            tMax = 1 - tMin,
            PI = Math.PI,
            // TODO: Make getCurve() sync work in boolean ops after splitting!!!
            c2 = this._curve,
            c1 = c2.getPrevious(),
            c4 = intersection._curve,
            c3 = c4.getPrevious();
        if (!c1 || !c3)
            return this._crossing = false;
        if (_report) {
            new Path.Circle({
                center: this.getPoint(),
                radius: 10,
                strokeColor: 'red'
            });
            new Path({
                segments: [c1.getSegment1(), c1.getSegment2(), c2.getSegment2()],
                strokeColor: 'red'
            });
            new Path({
                segments: [c3.getSegment1(), c3.getSegment2(), c4.getSegment2()],
                strokeColor: 'orange'
            });
        }

        function isInRange(angle, min, max) {
            return min < max
                ? angle > min && angle < max
                // The range wraps around -PI / PI:
                : angle > min && angle <= PI || angle >= -PI && angle < max;
        }

        // Calculate angles for all four tangents at the intersection point
        var a1 = c1.getTangentAt(tMax, true).negate().getAngleInRadians(),
            a2 = c2.getTangentAt(tMin, true).getAngleInRadians(),
            a3 = c3.getTangentAt(tMax, true).negate().getAngleInRadians(),
            a4 = c4.getTangentAt(tMin, true).getAngleInRadians();

        // Count how many times curve2 angles appear between the curve1 angles
        // If each pair of angles split the other two, then the edges cross.
        return (isInRange(a3, a1, a2) ^ isInRange(a4, a1, a2))
            && (isInRange(a3, a2, a1) ^ isInRange(a4, a2, a1));
    },

    /**
     * Checks whether tow CurveLocation objects are describing the same location
     * on a path, by applying the same tolerances as elsewhere when dealing with
     * curve time parameters.
     *
     * @param {CurveLocation} location
     * @return {Boolean} {@true if the locations are equal}
     */
    equals: function(loc, _ignoreOther) {
        return this === loc
            || loc instanceof CurveLocation
                // Call getCurve() and getParameter() to keep in sync
                && this.getCurve() === loc.getCurve()
                && this.getPoint().isClose(loc.getPoint(),
                        /*#=*/Numerical.GEOMETRIC_EPSILON)
                && (_ignoreOther
                    || (!this._intersection && !loc._intersection
                        || this._intersection && this._intersection.equals(
                                loc._intersection, true)))
            || false;
    },

    /**
     * @return {String} a string representation of the curve location
     */
    toString: function() {
        var parts = [],
            point = this.getPoint(),
            f = Formatter.instance;
        if (point)
            parts.push('point: ' + point);
        var index = this.getIndex();
        if (index != null)
            parts.push('index: ' + index);
        var parameter = this.getParameter();
        if (parameter != null)
            parts.push('parameter: ' + f.number(parameter));
        if (this._distance != null)
            parts.push('distance: ' + f.number(this._distance));
        return '{ ' + parts.join(', ') + ' }';
    },

    statics: {
        sort: function(locations) {
            function compare(l1, l2, _ignoreOther) {
                if (!l1 || !l2)
                    return l1 ? -1 : 0;
                var curve1 = l1._curve,
                    curve2 = l2._curve,
                    path1 = curve1._path,
                    path2 = curve2._path,
                    diff;
                // Sort by path-id, curve, parameter, curve2, parameter2 so we
                // can easily remove duplicates with calls to equals() after.
                // NOTE: We don't call getCurve() / getParameter() here, since
                // this code is used internally in boolean operations where all
                // this information remains valid during processing.
                return path1 === path2
                        ? curve1 === curve2
                            // TODO: Compare points instead of parameter like in
                            // equals? Or time there too? Why was it changed?
                            ? Math.abs((diff = l1._parameter - l2._parameter))
                                < /*#=*/Numerical.CURVETIME_EPSILON
                                ? _ignoreOther
                                    ? 0
                                    : compare(l1._intersection,
                                            l2._intersection, true)
                                : diff
                            : curve1.getIndex() - curve2.getIndex()
                        // Sort by path id to group all locs on the same path.
                        : path1._id - path2._id;
            }
            locations.sort(compare);
        }
    }
}, Base.each(Curve.evaluateMethods, function(name) {
    // Produce getters for #getTangent() / #getNormal() / #getCurvature()
    if (name !== 'getPoint') {
        var get = name + 'At';
        this[name] = function() {
            var parameter = this.getParameter(),
                curve = this.getCurve();
            return parameter != null && curve && curve[get](parameter, true);
        };
    }
}, {}));
