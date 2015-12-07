/*!
 * Paper.js v0.9.25 - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: Sun Oct 25 11:24:42 2015 +0100
 *
 ***
 *
 * Straps.js - Class inheritance library with support for bean-style accessors
 *
 * Copyright (c) 2006 - 2013 Juerg Lehni
 * http://scratchdisk.com/
 *
 * Distributed under the MIT license.
 *
 ***
 *
 * Acorn.js
 * http://marijnhaverbeke.nl/acorn/
 *
 * Acorn is a tiny, fast JavaScript parser written in JavaScript,
 * created by Marijn Haverbeke and released under an MIT license.
 *
 */

// Allow the minification of the undefined variable by defining it as a local
// parameter inside the paper scope.
var paper = new function(undefined) {
// Inline Straps.js core (the Base class) inside the paper scope first:
/**
 * straps.js - Class inheritance library with support for bean-style accessors
 *
 * Copyright (c) 2006 - 2014 Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the MIT license.
 *
 * straps.js was created by extracting and simplifying the inheritance framework
 * from boostrap.js, a JavaScript DOM library, also created by Juerg Lehni:
 * https://github.com/lehni/bootstrap.js
 *
 * Inspirations:
 * http://dean.edwards.name/weblog/2006/03/base/
 * http://dev.helma.org/Wiki/JavaScript+Inheritance+Sugar/
 */

var Base = new function() {
	var hidden = /^(statics|enumerable|beans|preserve)$/,

		forEach = [].forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++)
				iter.call(bind, this[i], i, this);
		},

		forIn = function(iter, bind) {
			// Do not use Object.keys for iteration as iterators might modify
			// the object we're iterating over, making the hasOwnProperty still
			// necessary.
			for (var i in this)
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);
		},

		// A short-cut to a simplified version of Object.create that only
		// supports the first parameter (in the emulation):
		create = Object.create || function(proto) {
			// From all browsers that do not offer Object.create(), we only
			// support Firefox 3.5 & 3.6, and this hack works there:
			return { __proto__: proto };
		},

		describe = Object.getOwnPropertyDescriptor || function(obj, name) {
			// Emulate Object.getOwnPropertyDescriptor for outdated browsers
			var get = obj.__lookupGetter__ && obj.__lookupGetter__(name);
			return get
					? { get: get, set: obj.__lookupSetter__(name),
						enumerable: true, configurable: true }
					: obj.hasOwnProperty(name)
						? { value: obj[name], enumerable: true,
							configurable: true, writable: true }
						: null;
		},

		_define = Object.defineProperty || function(obj, name, desc) {
			// Emulate Object.defineProperty for outdated browsers
			if ((desc.get || desc.set) && obj.__defineGetter__) {
				if (desc.get)
					obj.__defineGetter__(name, desc.get);
				if (desc.set)
					obj.__defineSetter__(name, desc.set);
			} else {
				obj[name] = desc.value;
			}
			return obj;
		},

		define = function(obj, name, desc) {
			// Both Safari and Chrome at one point ignored configurable = true
			// and did not allow overriding of existing properties:
			// https://code.google.com/p/chromium/issues/detail?id=72736
			// https://bugs.webkit.org/show_bug.cgi?id=54289
			// The workaround is to delete the property first.
			// TODO: Remove this fix in July 2014, and use _define directly.
			delete obj[name];
			return _define(obj, name, desc);
		};

	/**
	 * Private function that injects functions from src into dest, overriding
	 * the previous definition, preserving a link to it through Function#base.
	 */
	function inject(dest, src, enumerable, beans, preserve) {
		var beansNames = {};

		/**
		 * Private function that injects one field with given name and checks if
		 * the field is a function with a previous definition that we need to
		 * link to through Function#base.
		 */
		function field(name, val) {
			// This does even work for prop: 0, as it will just be looked up
			// again through describe.
			val = val || (val = describe(src, name))
					&& (val.get ? val : val.value);
			// Allow aliases to properties with different names, by having
			// string values starting with '#'
			if (typeof val === 'string' && val[0] === '#')
				val = dest[val.substring(1)] || val;
			var isFunc = typeof val === 'function',
				res = val,
				// Only lookup previous value if we preserve existing entries or
				// define a function that might need it for Function#base. If
				// a getter is defined, don't lookup previous value, but look if
				// the property exists (name in dest) and store result in prev.
				// Also check if the function doesn't already have #base defined
				// in which case it shall not be overridden. This occurs when
				// injecting statics from one constructor function to the next
				// for inheritance. e.g. in Mootools' Function#extend would
				// falsely be preserved up the inheritance chain through #base.
				prev = preserve || isFunc && !val.base
						? (val && val.get ? name in dest : dest[name])
						: null,
				bean;
			if (!preserve || !prev) {
				// Expose the 'super' function (meaning the one this function is
				// overriding) through Function#base:
				if (isFunc && prev)
					val.base = prev;
				// Produce bean properties if getters or setters are specified.
				// Just collect potential beans for now, and look them up in
				// dest at the end of fields injection. This ensures base works
				// for beans too, and inherits setters for redefined getters in
				// subclasses.
				if (isFunc && beans !== false
						&& (bean = name.match(/^([gs]et|is)(([A-Z])(.*))$/)))
					beansNames[bean[3].toLowerCase() + bean[4]] = bean[2];
				// No need to create accessor description if it already is one.
				// It is considered a description if it is a plain object with a
				// get function.
				if (!res || isFunc || !res.get || typeof res.get !== 'function'
						|| !Base.isPlainObject(res))
					res = { value: res, writable: true };
				// Only set/change configurable and enumerable if this field is
				// configurable
				if ((describe(dest, name)
						|| { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
			}
		}
		// Iterate through all definitions in src now and call field() for each.
		if (src) {
			for (var name in src) {
				if (src.hasOwnProperty(name) && !hidden.test(name))
					field(name);
			}
			// Now process the beans as well.
			for (var name in beansNames) {
				// Simple Beans Convention:
				// - If `beans: false` is specified, no beans are injected.
				// - `isName()` is only considered a getter of a  bean accessor
				//	 if there is also a setter for it.
				// - If a potential getter has no parameters, it forms a bean
				//	 accessor.
				// - If `beans: true` is specified, the parameter count of a
				//	 potential getter is ignored and the bean is always created.
				var part = beansNames[name],
					set = dest['set' + part],
					get = dest['get' + part] || set && dest['is' + part];
				if (get && (beans === true || get.length === 0))
					field(name, { get: get, set: set });
			}
		}
		return dest;
	}

	function each(obj, iter, bind) {
		// To support both array-like structures and plain objects, use a simple
		// hack to filter out Base objects with #length getters in the
		// #length-base array-like check for now, by assuming these getters are
		// produced by #getLength beans.
		// NOTE: The correct check would call describe(obj, 'length') and look
		// for typeof res.value === 'number', but it's twice as slow on Chrome
		// and Firefox (WebKit does well), so this should do for now.
		if (obj)
			('length' in obj && !obj.getLength
					&& typeof obj.length === 'number'
				? forEach
				: forIn).call(obj, iter, bind = bind || obj);
		return bind;
	}

	function set(obj, props, exclude) {
		for (var key in props)
			if (props.hasOwnProperty(key) && !(exclude && exclude[key]))
				obj[key] = props[key];
		return obj;
	}

	// Inject into new ctor object that's passed to inject(), and then returned
	// as the Base class.
	return inject(function Base() {
		// Define a constructor that merges in all the fields of the passed
		// objects using set()
		for (var i = 0, l = arguments.length; i < l; i++)
			set(this, arguments[i]);
	}, {
		inject: function(src/*, ... */) {
			if (src) {
				// Allow the whole scope to just define statics by defining
				// `statics: true`
				var statics = src.statics === true ? src : src.statics,
					beans = src.beans,
					preserve = src.preserve;
				if (statics !== src)
					inject(this.prototype, src, src.enumerable, beans, preserve);
				// Define new static fields as enumerable, and inherit from
				// base. enumerable is necessary so they can be copied over from
				// base, and it does not harm to have enumerable properties in
				// the constructor. Use the preserve setting in src.preserve for
				// statics too, not their own.
				inject(this, statics, true, beans, preserve);
			}
			// If there are more than one argument, loop through them and call
			// inject again. Do not simple inline the above code in one loop,
			// since each of the passed objects might override this.inject.
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(/* src, ... */) {
			var base = this,
				ctor,
				proto;
			// Look for an initialize function in all injection objects and use
			// it directly as the actual constructor.
			for (var i = 0, l = arguments.length; i < l; i++)
				if (ctor = arguments[i].initialize)
					break;
			// If no initialize function is provided, create a constructor that
			// simply calls the base constructor.
			ctor = ctor || function() {
				base.apply(this, arguments);
			};
			proto = ctor.prototype = create(this.prototype);
			// The new prototype extends the constructor on which extend is
			// called. Fix constructor.
			define(proto, 'constructor',
					{ value: ctor, writable: true, configurable: true });
			// Copy over static fields, as prototype-like inheritance
			// is not possible for static fields. Mark them as enumerable
			// so they can be copied over again.
			inject(ctor, this, true);
			// Inject all the definitions in src. Use the new inject instead of
			// the one in ctor, in case it was overridden. this is needed when
			// overriding the static .inject(). But only inject if there's
			// something to actually inject.
			if (arguments.length)
				this.inject.apply(ctor, arguments);
			// Expose base property on constructor functions as well.
			// Do this after everything else, to avoid incorrect overriding of
			// `base` in inject() when creating long super call chains in
			// constructors.
			ctor.base = base;
			return ctor;
		}
		// Pass true for enumerable, so inject() and extend() can be passed on
		// to subclasses of Base through Base.inject() / extend().
	}, true).inject({
		/**
		 * Injects the fields from the given object.
		 */
		inject: function(/* src, ... */) {
			for (var i = 0, l = arguments.length; i < l; i++) {
				var src = arguments[i];
				if (src)
					inject(this, src, src.enumerable, src.beans, src.preserve);
			}
			return this;
		},

		/**
		 * Returns a new object that inherits all properties from "this",
		 * through proper JS inheritance, not copying.
		 * Optionally, src and hide parameters can be passed to fill in the
		 * newly created object just like in inject(), to copy the behavior
		 * of Function.prototype.extend.
		 */
		extend: function(/* src, ... */) {
			var res = create(this);
			return res.inject.apply(res, arguments);
		},

		each: function(iter, bind) {
			return each(this, iter, bind);
		},

		set: function(props) {
			return set(this, props);
		},

		/**
		 * General purpose clone function that delegates cloning to the
		 * constructor that receives the object to be cloned as the first
		 * argument.
		 * NOTE: #clone() needs to be overridden in any class that requires
		 * other cloning behavior.
		 */
		clone: function() {
			return new this.constructor(this);
		},

		statics: {
			// Expose some local privates as static functions on Base.
			each: each,
			create: create,
			define: define,
			describe: describe,
			set: set,

			clone: function(obj) {
				return set(new obj.constructor(), obj);
			},

			/**
			 * Returns true if obj is a plain JavaScript object literal, or a
			 * plain Base object, as produced by Base.merge().
			 */
			isPlainObject: function(obj) {
				var ctor = obj != null && obj.constructor;
				// We also need to check for ctor.name === 'Object', in case
				// this is an object from another global scope (e.g. an iframe,
				// or another vm context in node.js).
				return ctor && (ctor === Object || ctor === Base
						|| ctor.name === 'Object');
			},

			/**
			 * Returns the 1st argument if it is defined, the 2nd otherwise.
			 * `null` is counted as defined too, as !== undefined is used for
			 * comparisons.
			 */
			pick: function(a, b) {
				return a !== undefined ? a : b;
			}
		}
	});
};

// Export Base class for node
if (typeof module !== 'undefined')
	module.exports = Base;




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
 * @name Base
 * @class
 * @private
 */
// Extend Base with utility functions used across the library.
Base.inject(/** @lends Base# */{
	/**
	 * Renders base objects to strings in object literal notation.
	 */
	toString: function() {
		return this._id != null
			?  (this._class || 'Object') + (this._name
				? " '" + this._name + "'"
				: ' @' + this._id)
			: '{ ' + Base.each(this, function(value, key) {
				// Hide internal properties even if they are enumerable
				if (!/^_/.test(key)) {
					var type = typeof value;
					this.push(key + ': ' + (type === 'number'
							? Formatter.instance.number(value)
							: type === 'string' ? "'" + value + "'" : value));
				}
			}, []).join(', ') + ' }';
	},

	/**
	 * The class name of the object as a string, if the prototype defines a
	 * `_class` value.
	 *
	 * @beans
	 */
	getClassName: function() {
		return this._class || '';
	},

	/**
	 * Exports (serializes) this object to a JSON data object or string.
	 *
	 * @option [options.asString=true] {Boolean} whether the JSON is returned as
	 * a {@code Object} or a {@code String}
	 * @option [options.precision=5] {Number} the amount of fractional digits in
	 * numbers used in JSON data
	 *
	 * @param {Object} [options] the serialization options
	 * @return {String} the exported JSON data
	 */
	exportJSON: function(options) {
		return Base.exportJSON(this, options);
	},

	// To support JSON.stringify:
	toJSON: function() {
		return Base.serialize(this);
	},

	/**
	 * #_set() is part of the mechanism for constructors which take one object
	 * literal describing all the properties to be set on the created instance.
	 *
	 * @param {Object} props an object describing the properties to set
	 * @param {Object} [exclude] a lookup table listing properties to exclude
	 * @param {Boolean} [dontCheck=false] whether to perform a
	 * Base.isPlainObject() check on props or not
	 * @return {Boolean} {@true if the object is a plain object}
	 */
	_set: function(props, exclude, dontCheck) {
		if (props && (dontCheck || Base.isPlainObject(props))) {
			// If props is a filtering object, we need to execute hasOwnProperty
			// on the original object (it's parent / prototype). See _filtered
			// inheritance trick in the argument reading code.
			var keys = Object.keys(props._filtering || props);
			for (var i = 0, l = keys.length; i < l; i++) {
				var key = keys[i];
				if (!(exclude && exclude[key])) {
					// Due to the _filtered inheritance trick, undefined is used
					// to mask already consumed named arguments.
					var value = props[key];
					if (value !== undefined)
						this[key] = value;
				}
			}
			return true;
		}
	},

	statics: /** @lends Base */{

		// Keep track of all named classes for serialization and exporting.
		exports: {
			enumerable: true // For PaperScope.inject() in export.js
		},

		extend: function extend() {
			// Override Base.extend() to register named classes in Base.exports,
			// for deserialization and injection into PaperScope.
			var res = extend.base.apply(this, arguments),
				name = res.prototype._class;
			if (name && !Base.exports[name])
				Base.exports[name] = res;
			return res;
		},

		/**
		 * Checks if two values or objects are equals to each other, by using
		 * their equals() methods if available, and also comparing elements of
		 * arrays and properties of objects.
		 */
		equals: function(obj1, obj2) {
			if (obj1 === obj2)
				return true;
			// Call #equals() on both obj1 and obj2
			if (obj1 && obj1.equals)
				return obj1.equals(obj2);
			if (obj2 && obj2.equals)
				return obj2.equals(obj1);
			// Deep compare objects or arrays
			if (obj1 && obj2
					&& typeof obj1 === 'object' && typeof obj2 === 'object') {
				// Compare arrays
				if (Array.isArray(obj1) && Array.isArray(obj2)) {
					var length = obj1.length;
					if (length !== obj2.length)
						return false;
					while (length--) {
						if (!Base.equals(obj1[length], obj2[length]))
							return false;
					}
				} else {
					// Deep compare objects.
					var keys = Object.keys(obj1),
						length = keys.length;
					// Ensure that both objects contain the same number of
					// properties before comparing deep equality.
					if (length !== Object.keys(obj2).length)
						return false;
					while (length--) {
						// Deep compare each member
						var key = keys[length];
						if (!(obj2.hasOwnProperty(key)
								&& Base.equals(obj1[key], obj2[key])))
							return false;
					}
				}
				return true;
			}
			return false;
		},

		/**
		 * When called on a subclass of Base, it reads arguments of the type of
		 * the subclass from the passed arguments list or array, at the given
		 * index, up to the specified length.
		 * When called directly on Base, it reads any value without conversion
		 * from the passed arguments list or array.
		 * This is used in argument conversion, e.g. by all basic types (Point,
		 * Size, Rectangle) and also higher classes such as Color and Segment.
		 *
		 * @param {Array} list the list to read from, either an arguments object
		 * or a normal array
		 * @param {Number} start the index at which to start reading in the list
		 * @param {Number} length the amount of elements that can be read
		 * @param {Object} options {@code options.readNull} controls whether
		 * null is returned or converted. {@code options.clone} controls whether
		 * passed objects should be cloned if they are already provided in the
		 * required type
		 */
		read: function(list, start, options, length) {
			// See if it's called directly on Base, and if so, read value and
			// return without object conversion.
			if (this === Base) {
				var value = this.peek(list, start);
				list.__index++;
				return value;
			}
			var proto = this.prototype,
				readIndex = proto._readIndex,
				index = start || readIndex && list.__index || 0;
			if (!length)
				length = list.length - index;
			var obj = list[index];
			if (obj instanceof this
				|| options && options.readNull && obj == null && length <= 1) {
				if (readIndex)
					list.__index = index + 1;
				return obj && options && options.clone ? obj.clone() : obj;
			}
			obj = Base.create(this.prototype);
			if (readIndex)
				obj.__read = true;
			obj = obj.initialize.apply(obj, index > 0 || length < list.length
				? Array.prototype.slice.call(list, index, index + length)
				: list) || obj;
			if (readIndex) {
				list.__index = index + obj.__read;
				obj.__read = undefined;
			}
			return obj;
		},

		/**
		 * Allows peeking ahead in reading of values and objects from arguments
		 * list through Base.read().
		 *
		 * @param {Array} list the list to read from, either an arguments object
		 * or a normal array
		 * @param {Number} start the index at which to start reading in the list
		 */
		peek: function(list, start) {
			return list[list.__index = start || list.__index || 0];
		},

		/**
		 * Returns how many arguments remain to be read in the argument list.
		 */
		remain: function(list) {
			return list.length - (list.__index || 0);
		},

		/**
		 * Reads all readable arguments from the list, handling nested arrays
		 * separately.
		 *
		 * @param {Array} list the list to read from, either an arguments object
		 * or a normal array
		 * @param {Number} start the index at which to start reading in the list
		 * @param {Object} options {@code options.readNull} controls whether
		 * null is returned or converted. {@code options.clone} controls whether
		 * passed objects should be cloned if they are already provided in the
		 * required type
		 */
		readAll: function(list, start, options) {
			var res = [],
				entry;
			for (var i = start || 0, l = list.length; i < l; i++) {
				res.push(Array.isArray(entry = list[i])
						? this.read(entry, 0, options)
						: this.read(list, i, options, 1));
			}
			return res;
		},

		/**
		 * Allows using of Base.read() mechanism in combination with reading
		 * named arguments form a passed property object literal. Calling
		 * Base.readNamed() can read both from such named properties and normal
		 * unnamed arguments through Base.read(). In use for example for the
		 * various Path.Constructors.
		 *
		 * @param {Array} list the list to read from, either an arguments object
		 * or a normal array
		 * @param {Number} start the index at which to start reading in the list
		 * @param {String} name the property name to read from
		 */
		readNamed: function(list, name, start, options, length) {
			var value = this.getNamed(list, name),
				hasObject = value !== undefined;
			if (hasObject) {
				// Create a _filtered object that inherits from argument 0, and
				// override all fields that were already read with undefined.
				var filtered = list._filtered;
				if (!filtered) {
					filtered = list._filtered = Base.create(list[0]);
					// Point _filtering to the original so Base#_set() can
					// execute hasOwnProperty on it.
					filtered._filtering = list[0];
				}
				// delete wouldn't work since the masked parent's value would
				// shine through.
				filtered[name] = undefined;
			}
			return this.read(hasObject ? [value] : list, start, options, length);
		},

		/**
		 * @return the named value if the list provides an arguments object,
		 * {@code null} if the named value is {@code null} or {@code undefined},
		 * and {@code undefined} if there is no arguments object
		 * If no name is provided, it returns the whole arguments object
		 */
		getNamed: function(list, name) {
			var arg = list[0];
			if (list._hasObject === undefined)
				list._hasObject = list.length === 1 && Base.isPlainObject(arg);
			if (list._hasObject)
				// Return the whole arguments object if no name is provided.
				return name ? arg[name] : list._filtered || arg;
		},

		/**
		 * Checks if the argument list has a named argument with the given name.
		 * If name is {@code null}, it returns {@code true} if there are any
		 * named arguments.
		 */
		hasNamed: function(list, name) {
			return !!this.getNamed(list, name);
		},

		/**
		 * Returns true if obj is either a plain object or an array, as used by
		 * many argument reading methods.
		 */
		isPlainValue: function(obj, asString) {
			return this.isPlainObject(obj) || Array.isArray(obj)
					|| asString && typeof obj === 'string';
		},

		/**
		 * Serializes the passed object into a format that can be passed to
		 * JSON.stringify() for JSON serialization.
		 */
		serialize: function(obj, options, compact, dictionary) {
			options = options || {};

			var root = !dictionary,
				res;
			if (root) {
				options.formatter = new Formatter(options.precision);
				// Create a simple dictionary object that handles all the
				// storing and retrieving of dictionary definitions and
				// references, e.g. for symbols and gradients. Items that want
				// to support this need to define globally unique _id attribute.
				/**
				 * @namespace
				 * @private
				 */
				dictionary = {
					length: 0,
					definitions: {},
					references: {},
					add: function(item, create) {
						// See if we have reference entry with the given id
						// already. If not, call create on the item to allow it
						// to create the definition, then store the reference
						// to it and return it.
						var id = '#' + item._id,
							ref = this.references[id];
						if (!ref) {
							this.length++;
							var res = create.call(item),
								name = item._class;
							// Also automatically insert class for dictionary
							// entries.
							if (name && res[0] !== name)
								res.unshift(name);
							this.definitions[id] = res;
							ref = this.references[id] = [id];
						}
						return ref;
					}
				};
			}
			if (obj && obj._serialize) {
				res = obj._serialize(options, dictionary);
				// If we don't serialize to compact form (meaning no type
				// identifier), see if _serialize didn't already add the class,
				// e.g. for classes that do not support compact form.
				var name = obj._class;
				if (name && !compact && !res._compact && res[0] !== name)
					res.unshift(name);
			} else if (Array.isArray(obj)) {
				res = [];
				for (var i = 0, l = obj.length; i < l; i++)
					res[i] = Base.serialize(obj[i], options, compact,
							dictionary);
				// Mark array as compact, so obj._serialize handling above
				// doesn't add the class name again.
				if (compact)
					res._compact = true;
			} else if (Base.isPlainObject(obj)) {
				res = {};
				var keys = Object.keys(obj);
				for (var i = 0, l = keys.length; i < l; i++) {
					var key = keys[i];
					res[key] = Base.serialize(obj[key], options, compact,
							dictionary);
				}
			} else if (typeof obj === 'number') {
				res = options.formatter.number(obj, options.precision);
			} else {
				res = obj;
			}
			return root && dictionary.length > 0
					? [['dictionary', dictionary.definitions], res]
					: res;
		},

		/**
		 * Deserializes from parsed JSON data. A simple convention is followed:
		 * Array values with a string at the first position are links to
		 * deserializable types through Base.exports, and the values following
		 * in the array are the arguments to their initialize function.
		 * Any other value is passed on unmodified.
		 * The passed json data is recoursively traversed and converted, leaves
		 * first
		 */
		deserialize: function(json, create, _data, _isDictionary) {
			var res = json,
				isRoot = !_data;
			// A _data side-car to deserialize that can hold any kind of
			// 'global' data across a deserialization. It's currently only used
			// to hold dictionary definitions.
			_data = _data || {};
			if (Array.isArray(json)) {
				// See if it's a serialized type. If so, the rest of the array
				// are the arguments to #initialize(). Either way, we simply
				// deserialize all elements of the array.
				var type = json[0],
					// Handle stored dictionary specially, since we need to
					// keep a lookup table to retrieve referenced items from.
					isDictionary = type === 'dictionary';
				// First see if this is perhaps a dictionary reference, and
				// if so return its definition instead.
				if (json.length == 1 && /^#/.test(type))
					return _data.dictionary[type];
				type = Base.exports[type];
				res = [];
				// We need to set the dictionary object before further
				// deserialization, because serialized symbols may contain
				// references to serialized gradients
				if (_isDictionary)
					_data.dictionary = res;
				// Skip first type entry for arguments
				for (var i = type ? 1 : 0, l = json.length; i < l; i++)
					res.push(Base.deserialize(json[i], create, _data,
							isDictionary));
				if (type) {
					// Create serialized type and pass collected arguments to
					// constructor().
					var args = res;
					// If a create method is provided, handle our own
					// creation. This is used in #importJSON() to pass
					// on insert = false to all items except layers.
					if (create) {
						res = create(type, args);
					} else {
						res = Base.create(type.prototype);
						type.apply(res, args);
					}
				}
			} else if (Base.isPlainObject(json)) {
				res = {};
				// See above why we have to set this before Base.deserialize()
				if (_isDictionary)
					_data.dictionary = res;
				for (var key in json)
					res[key] = Base.deserialize(json[key], create, _data);
			}
			// Filter out deserialized dictionary.
			return isRoot && json && json.length && json[0][0] === 'dictionary'
					? res[1]
					: res;
		},

		exportJSON: function(obj, options) {
			var json = Base.serialize(obj, options);
			return options && options.asString === false
					? json
					: JSON.stringify(json);
		},

		importJSON: function(json, target) {
			return Base.deserialize(
					typeof json === 'string' ? JSON.parse(json) : json,
					// Provide our own create function to handle target and
					// insertion
					function(type, args) {
						// If a target is provided and its of the right type,
						// import right into it.
						var obj = target && target.constructor === type
								? target
								: Base.create(type.prototype),
							isTarget = obj === target;
						// Note: We don't set insert false for layers since
						// we want these to be created on the fly in the active
						// project into which we're importing (except for if
						// it's a preexisting target layer).
						if (args.length === 1 && obj instanceof Item
								&& (isTarget || !(obj instanceof Layer))) {
							var arg = args[0];
							if (Base.isPlainObject(arg))
								arg.insert = false;
						}
						type.apply(obj, args);
						// Clear target to only use it once
						if (isTarget)
							target = null;
						return obj;
					});
		},

		/**
		 * Utility function for adding and removing items from a list of which
		 * each entry keeps a reference to its index in the list in the private
		 * _index property. Used for PaperScope#projects and Item#children.
		 */
		splice: function(list, items, index, remove) {
			var amount = items && items.length,
				append = index === undefined;
			index = append ? list.length : index;
			if (index > list.length)
				index = list.length;
			// Update _index on the items to be added first.
			for (var i = 0; i < amount; i++)
				items[i]._index = index + i;
			if (append) {
				// Append them all at the end by using push
				list.push.apply(list, items);
				// Nothing removed, and nothing to adjust above
				return [];
			} else {
				// Insert somewhere else and/or remove
				var args = [index, remove];
				if (items)
					args.push.apply(args, items);
				var removed = list.splice.apply(list, args);
				// Erase the indices of the removed items
				for (var i = 0, l = removed.length; i < l; i++)
					removed[i]._index = undefined;
				// Adjust the indices of the items above.
				for (var i = index + amount, l = list.length; i < l; i++)
					list[i]._index = i;
				return removed;
			}
		},

		/**
		 * Capitalizes the passed string: hello world -> Hello World
		 */
		capitalize: function(str) {
			return str.replace(/\b[a-z]/g, function(match) {
				return match.toUpperCase();
			});
		},

		/**
		 * Camelizes the passed hyphenated string: caps-lock -> capsLock
		 */
		camelize: function(str) {
			return str.replace(/-(.)/g, function(all, chr) {
				return chr.toUpperCase();
			});
		},

		/**
		 * Converst camelized strings to hyphenated ones: CapsLock -> caps-lock
		 */
		hyphenate: function(str) {
			return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
		}
	}
});

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
 * @name Emitter
 * @namespace
 * @private
 */
var Emitter = {
	on: function(type, func) {
		// If an object literal is passed, attach all callbacks defined in it
		if (typeof type !== 'string') {
			Base.each(type, function(value, key) {
				this.on(key, value);
			}, this);
		} else {
			var types = this._eventTypes,
				entry = types && types[type],
				handlers = this._callbacks = this._callbacks || {};
			handlers = handlers[type] = handlers[type] || [];
			if (handlers.indexOf(func) === -1) { // Not added yet, add now.
				handlers.push(func);
				// See if this is the first handler that we're attaching,
				// and call install if defined.
				if (entry && entry.install && handlers.length === 1)
					entry.install.call(this, type);
			}
		}
		return this;
	},

	off: function(type, func) {
		// If an object literal is passed, detach all callbacks defined in it
		if (typeof type !== 'string') {
			Base.each(type, function(value, key) {
				this.off(key, value);
			}, this);
			return;
		}
		var types = this._eventTypes,
			entry = types && types[type],
			handlers = this._callbacks && this._callbacks[type],
			index;
		if (handlers) {
			// See if this is the last handler that we're detaching (or if we
			// are detaching all handlers), and call uninstall if defined.
			if (!func || (index = handlers.indexOf(func)) !== -1
					&& handlers.length === 1) {
				if (entry && entry.uninstall)
					entry.uninstall.call(this, type);
				// Delete handlers entry again, so responds() returns false.
				delete this._callbacks[type];
			} else if (index !== -1) {
				// Just remove this one handler
				handlers.splice(index, 1);
			}
		}
		return this;
	},

	once: function(type, func) {
		return this.on(type, function() {
			func.apply(this, arguments);
			this.off(type, func);
		});
	},

	emit: function(type, event) {
		// Returns true if fired, false otherwise
		var handlers = this._callbacks && this._callbacks[type];
		if (!handlers)
			return false;
		var args = [].slice.call(arguments, 1);
		// Create a clone of the handlers list so changes caused by on / off
		// won't throw us off track here:
		handlers = handlers.slice();
		for (var i = 0, l = handlers.length; i < l; i++) {
			// When the handler function returns false, prevent the default
			// behavior and stop propagation of the event by calling stop()
			if (handlers[i].apply(this, args) === false) {
				if (event && event.stop)
					event.stop();
				break;
			}
		}
		return true;
	},

	responds: function(type) {
		return !!(this._callbacks && this._callbacks[type]);
	},

	// Keep deprecated methods around from previous Callback interface.
	attach: '#on',
	detach: '#off',
	fire: '#emit',

	_installEvents: function(install) {
		var handlers = this._callbacks,
			key = install ? 'install' : 'uninstall';
		for (var type in handlers) {
			if (handlers[type].length > 0) {
				var types = this._eventTypes,
					entry = types && types[type],
					func = entry && entry[key];
				if (func)
					func.call(this, type);
			}
		}
	},

	statics: {
		// Override inject() so that sub-classes automatically add the accessors
		// for the event handler functions (e.g. #onMouseDown) for each property
		// NOTE: This needs to be defined in the first injection scope, as for
		// simplicity, we don't loop through all of them here.
		inject: function inject(src) {
			var events = src._events;
			if (events) {
				// events can either be an object literal or an array of
				// strings describing the on*-names.
				// We need to map lowercased event types to the event
				// entries represented by these on*-names in _events.
				var types = {};
				Base.each(events, function(entry, key) {
					var isString = typeof entry === 'string',
						name = isString ? entry : key,
						part = Base.capitalize(name),
						type = name.substring(2).toLowerCase();
					// Map the event type name to the event entry.
					types[type] = isString ? {} : entry;
					// Create getters and setters for the property
					// with the on*-name name:
					name = '_' + name;
					src['get' + part] = function() {
						return this[name];
					};
					src['set' + part] = function(func) {
						// Detach the previous event, if there was one.
						var prev = this[name];
						if (prev)
							this.off(type, prev);
						if (func)
							this.on(type, func);
						this[name] = func;
					};
				});
				src._eventTypes = types;
			}
			return inject.base.apply(this, arguments);
		}
	}
};

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
 * @name PaperScope
 *
 * @class The {@code PaperScope} class represents the scope associated with a
 * Paper context. When working with PaperScript, these scopes are automatically
 * created for us, and through clever scoping the properties and methods of the
 * active scope seem to become part of the global scope.
 *
 * When working with normal JavaScript code, {@code PaperScope} objects need to
 * be manually created and handled.
 *
 * Paper classes can only be accessed through {@code PaperScope} objects. Thus
 * in PaperScript they are global, while in JavaScript, they are available on
 * the global {@link paper} object. For JavaScript you can use
 * {@link PaperScope#install(scope) } to install the Paper classes and objects
 * on the global scope. Note that when working with more than one scope, this
 * still works for classes, but not for objects like {@link PaperScope#project},
 * since they are not updated in the injected scope if scopes are switched.
 *
 * The global {@link paper} object is simply a reference to the currently active
 * {@code PaperScope}.
 */
var PaperScope = Base.extend(/** @lends PaperScope# */{
	_class: 'PaperScope',

	/**
	 * Creates a PaperScope object.
	 *
	 * @name PaperScope#initialize
	 * @function
	 */
	// DOCS: initialize() parameters
	initialize: function PaperScope() {
		// element is only used internally when creating scopes for PaperScript.
		// Whenever a PaperScope is created, it automatically becomes the active
		// one.
		paper = this;
		// Default configurable settings.
		this.settings = new Base({
			applyMatrix: true,
			handleSize: 4,
			hitTolerance: 0
		});
		this.project = null;
		this.projects = [];
		this.tools = [];
		this.palettes = [];
		// Assign a unique id to each scope .
		this._id = PaperScope._id++;
		PaperScope._scopes[this._id] = this;
		var proto = PaperScope.prototype;
		if (!this.support) {
			// Set up paper.support, as an object containing properties that
			// describe the support of various features.
			var ctx = CanvasProvider.getContext(1, 1);
			proto.support = {
				nativeDash: 'setLineDash' in ctx || 'mozDash' in ctx,
				nativeBlendModes: BlendMode.nativeModes
			};
			CanvasProvider.release(ctx);
		}

	},

	/**
	 * The version of Paper.js, as a string.
	 *
	 * @type String
	 */
	version: "0.9.25",

	// DOCS: PaperScope#settings
	/**
	 * Gives access to paper's configurable settings.
	 *
	 * @name PaperScope#settings
	 * @type Object
	 *
	 * @option [settings.applyMatrix=true] {Boolean}
	 * @option [settings.handleSize=4] {Number}
	 * @option [settings.hitTolerance=0] {Number}
	 */

	/**
	 * The currently active project.
	 * @name PaperScope#project
	 * @type Project
	 */

	/**
	 * The list of all open projects within the current Paper.js context.
	 * @name PaperScope#projects
	 * @type Project[]
	 */

	/**
	 * The reference to the active project's view.
	 * @type View
	 * @bean
	 */
	getView: function() {
		return this.project && this.project.getView();
	},

	/**
	 * The reference to the active tool.
	 * @name PaperScope#tool
	 * @type Tool
	 */

	/**
	 * The list of available tools.
	 * @name PaperScope#tools
	 * @type Tool[]
	 */

	/**
	 * A reference to the local scope. This is required, so `paper` will always
	 * refer to the local scope, even when calling into it from another scope.
	 * `paper.activate();` will have to be called in such a situation.
	 * @type PaperScript
	 * @private
	 * @bean
	 */
	getPaper: function() {
		return this;
	},

	execute: function(code, url, options) {
		paper.PaperScript.execute(code, this, url, options);
		View.updateFocus();
	},

	/**
	 * Injects the paper scope into any other given scope. Can be used for
	 * example to inject the currently active PaperScope into the window's
	 * global scope, to emulate PaperScript-style globally accessible Paper
	 * classes and objects.
	 *
	 * <b>Please note:</b> Using this method may override native constructors
	 * (e.g. Path). This may cause problems when using Paper.js in conjunction
	 * with other libraries that rely on these constructors. Keep the library
	 * scoped if you encounter issues caused by this.
	 *
	 * @example
	 * paper.install(window);
	 */
	install: function(scope) {
		// Define project, view and tool as getters that redirect to these
		// values on the PaperScope, so they are kept up to date
		var that = this;
		Base.each(['project', 'view', 'tool'], function(key) {
			Base.define(scope, key, {
				configurable: true,
				get: function() {
					return that[key];
				}
			});
		});
		// Copy over all fields from this scope to the destination.
		// Do not use Base.each, since we also want to enumerate over
		// fields on PaperScope.prototype, e.g. all classes
		for (var key in this)
			// Exclude all 'hidden' fields
			if (!/^_/.test(key) && this[key])
				scope[key] = this[key];
	},

	/**
	 * Sets up an empty project for us. If a canvas is provided, it also creates
	 * a {@link View} for it, both linked to this scope.
	 *
	 * @param {HTMLCanvasElement|String} element the HTML canvas element this
	 * scope should be associated with, or an ID string by which to find the
	 * element.
	 */
	setup: function(element) {
		// Make sure this is the active scope, so the created project and view
		// are automatically associated with it.
		paper = this;
		// Create an empty project for the scope.
		this.project = new Project(element);
		// This is needed in PaperScript.load().
		return this;
	},

	/**
	 * Activates this PaperScope, so all newly created items will be placed
	 * in its active project.
	 */
	activate: function() {
		paper = this;
	},

	clear: function() {
		// Remove all projects, views and tools.
		// This also removes the installed event handlers.
		for (var i = this.projects.length - 1; i >= 0; i--)
			this.projects[i].remove();
		for (var i = this.tools.length - 1; i >= 0; i--)
			this.tools[i].remove();
		for (var i = this.palettes.length - 1; i >= 0; i--)
			this.palettes[i].remove();
	},

	remove: function() {
		this.clear();
		delete PaperScope._scopes[this._id];
	},

	statics: new function() {
		// Produces helpers to e.g. check for both 'canvas' and
		// 'data-paper-canvas' attributes:
		function handleAttribute(name) {
			name += 'Attribute';
			return function(el, attr) {
				return el[name](attr) || el[name]('data-paper-' + attr);
			};
		}

		return /** @lends PaperScope */{
			_scopes: {},
			_id: 0,

			/**
			 * Retrieves a PaperScope object with the given scope id.
			 *
			 * @param id
			 */
			get: function(id) {
				return this._scopes[id] || null;
			},

			getAttribute: handleAttribute('get'),
			hasAttribute: handleAttribute('has')
		};
	}
});

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
 * @name PaperScopeItem
 *
 * @class A private base class for all classes that have lists and references in
 * the {@link PaperScope} ({@link Project}, {@link View}, {@link Tool}), so
 * functionality can be shared.
 *
 * @private
 */
var PaperScopeItem = Base.extend(Emitter, /** @lends PaperScopeItem# */{

	/**
	 * Creates a PaperScopeItem object.
	 */
	initialize: function(activate) {
		// Store reference to the currently active global paper scope:
		this._scope = paper;
		// Push it onto this._scope[this._list] and set _index:
		this._index = this._scope[this._list].push(this) - 1;
		// If the project has no active reference, activate this one
		if (activate || !this._scope[this._reference])
			this.activate();
	},

	activate: function() {
		if (!this._scope)
			return false;
		var prev = this._scope[this._reference];
		if (prev && prev !== this)
			prev.emit('deactivate');
		this._scope[this._reference] = this;
		this.emit('activate', prev);
		return true;
	},

	isActive: function() {
		return this._scope[this._reference] === this;
	},

	remove: function() {
		if (this._index == null)
			return false;
		Base.splice(this._scope[this._list], null, this._index, 1);
		// Clear the active tool reference if it was pointint to this.
		if (this._scope[this._reference] == this)
			this._scope[this._reference] = null;
		this._scope = null;
		return true;
	}
});


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
 * @name Formatter
 * @class
 * @private
 */
var Formatter = Base.extend(/** @lends Formatter# */{
	/**
	 * @param {Number} [precision=5] the amount of fractional digits
	 */
	initialize: function(precision) {
		this.precision = precision || 5;
		this.multiplier = Math.pow(10, this.precision);
	},

	/**
	 * Utility function for rendering numbers as strings at a precision of
	 * up to the amount of fractional digits.
	 *
	 * @param {Number} num the number to be converted to a string
	 */
	number: function(val) {
		// It would be nice to use Number#toFixed() instead, but it pads with 0,
		// unecessarily consuming space.
		return Math.round(val * this.multiplier) / this.multiplier;
	},

	pair: function(val1, val2, separator) {
		return this.number(val1) + (separator || ',') + this.number(val2);
	},

	point: function(val, separator) {
		return this.number(val.x) + (separator || ',') + this.number(val.y);
	},

	size: function(val, separator) {
		return this.number(val.width) + (separator || ',')
				+ this.number(val.height);
	},

	rectangle: function(val, separator) {
		return this.point(val, separator) + (separator || ',')
				+ this.size(val, separator);
	}
});

Formatter.instance = new Formatter();

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
 * @name Numerical
 * @namespace
 * @private
 */
var Numerical = new function() {

	// Lookup tables for abscissas and weights with values for n = 2 .. 16.
	// As values are symmetric, only store half of them and adapt algorithm
	// to factor in symmetry.
	var abscissas = [
		[  0.5773502691896257645091488],
		[0,0.7745966692414833770358531],
		[  0.3399810435848562648026658,0.8611363115940525752239465],
		[0,0.5384693101056830910363144,0.9061798459386639927976269],
		[  0.2386191860831969086305017,0.6612093864662645136613996,0.9324695142031520278123016],
		[0,0.4058451513773971669066064,0.7415311855993944398638648,0.9491079123427585245261897],
		[  0.1834346424956498049394761,0.5255324099163289858177390,0.7966664774136267395915539,0.9602898564975362316835609],
		[0,0.3242534234038089290385380,0.6133714327005903973087020,0.8360311073266357942994298,0.9681602395076260898355762],
		[  0.1488743389816312108848260,0.4333953941292471907992659,0.6794095682990244062343274,0.8650633666889845107320967,0.9739065285171717200779640],
		[0,0.2695431559523449723315320,0.5190961292068118159257257,0.7301520055740493240934163,0.8870625997680952990751578,0.9782286581460569928039380],
		[  0.1252334085114689154724414,0.3678314989981801937526915,0.5873179542866174472967024,0.7699026741943046870368938,0.9041172563704748566784659,0.9815606342467192506905491],
		[0,0.2304583159551347940655281,0.4484927510364468528779129,0.6423493394403402206439846,0.8015780907333099127942065,0.9175983992229779652065478,0.9841830547185881494728294],
		[  0.1080549487073436620662447,0.3191123689278897604356718,0.5152486363581540919652907,0.6872929048116854701480198,0.8272013150697649931897947,0.9284348836635735173363911,0.9862838086968123388415973],
		[0,0.2011940939974345223006283,0.3941513470775633698972074,0.5709721726085388475372267,0.7244177313601700474161861,0.8482065834104272162006483,0.9372733924007059043077589,0.9879925180204854284895657],
		[  0.0950125098376374401853193,0.2816035507792589132304605,0.4580167776572273863424194,0.6178762444026437484466718,0.7554044083550030338951012,0.8656312023878317438804679,0.9445750230732325760779884,0.9894009349916499325961542]
	];

	var weights = [
		[1],
		[0.8888888888888888888888889,0.5555555555555555555555556],
		[0.6521451548625461426269361,0.3478548451374538573730639],
		[0.5688888888888888888888889,0.4786286704993664680412915,0.2369268850561890875142640],
		[0.4679139345726910473898703,0.3607615730481386075698335,0.1713244923791703450402961],
		[0.4179591836734693877551020,0.3818300505051189449503698,0.2797053914892766679014678,0.1294849661688696932706114],
		[0.3626837833783619829651504,0.3137066458778872873379622,0.2223810344533744705443560,0.1012285362903762591525314],
		[0.3302393550012597631645251,0.3123470770400028400686304,0.2606106964029354623187429,0.1806481606948574040584720,0.0812743883615744119718922],
		[0.2955242247147528701738930,0.2692667193099963550912269,0.2190863625159820439955349,0.1494513491505805931457763,0.0666713443086881375935688],
		[0.2729250867779006307144835,0.2628045445102466621806889,0.2331937645919904799185237,0.1862902109277342514260976,0.1255803694649046246346943,0.0556685671161736664827537],
		[0.2491470458134027850005624,0.2334925365383548087608499,0.2031674267230659217490645,0.1600783285433462263346525,0.1069393259953184309602547,0.0471753363865118271946160],
		[0.2325515532308739101945895,0.2262831802628972384120902,0.2078160475368885023125232,0.1781459807619457382800467,0.1388735102197872384636018,0.0921214998377284479144218,0.0404840047653158795200216],
		[0.2152638534631577901958764,0.2051984637212956039659241,0.1855383974779378137417166,0.1572031671581935345696019,0.1215185706879031846894148,0.0801580871597602098056333,0.0351194603317518630318329],
		[0.2025782419255612728806202,0.1984314853271115764561183,0.1861610000155622110268006,0.1662692058169939335532009,0.1395706779261543144478048,0.1071592204671719350118695,0.0703660474881081247092674,0.0307532419961172683546284],
		[0.1894506104550684962853967,0.1826034150449235888667637,0.1691565193950025381893121,0.1495959888165767320815017,0.1246289712555338720524763,0.0951585116824927848099251,0.0622535239386478928628438,0.0271524594117540948517806]
	];

	// Math short-cuts for often used methods and values
	var abs = Math.abs,
		sqrt = Math.sqrt,
		pow = Math.pow,
		EPSILON = 1e-12,
		MACHINE_EPSILON = 1.12e-16;

	function clip(value, min, max) {
		return value < min ? min : value > max ? max : value;
	}

	return /** @lends Numerical */{
		TOLERANCE: 1e-6,
		/**
		 * A very small absolute value used to check if a value is very close to
		 * zero. The value should be large enough to offset any floating point
		 * noise, but small enough to be meaningful in computation in a nominal
		 * range (see MACHINE_EPSILON).
		 *
		 * http://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html
		 * http://www.cs.berkeley.edu/~wkahan/Math128/Cubic.pdf
		 */
		EPSILON: EPSILON,
		/**
		 * The machine epsilon for a double precision (Javascript Number) is
		 * 2.220446049250313e-16. (try this in the js console:
		 *	   (function(){for(var e=1;1<1+e/2;)e/=2;return e}())
		 *
		 * The constant MACHINE_EPSILON here refers to the constants δ and ε
		 * such that, the error introduced by addition, multiplication on a
		 * 64bit float (js Number) will be less than δ and ε. That is to say,
		 * for all X and Y representable by a js Number object, S and P be their
		 * 'exact' sum and product respectively, then
		 * |S - (x+y)| <= δ|S|, and |P - (x*y)| <= ε|P|.
		 * This amounts to about half of the actual machine epsilon.
		 */
		MACHINE_EPSILON: MACHINE_EPSILON,
		/**
		 * The epsilon to be used when handling curve-time parameters. This
		 * cannot be smaller, because errors add up to around 2e-7 in the bezier
		 * fat-line clipping code as a result of recursive sub-division.
		 */
		CURVETIME_EPSILON: 4e-7, // NOTE: 2e-7 doesn't work in some edge-cases!
		/**
		 * The epsilon to be used when performing "geometric" checks, such as
		 * distances between points and lines.
		 */
		GEOMETRIC_EPSILON: 2e-7,
		/**
		 * The epsilon to be used when performing winding contribution checks.
		 */
		WINDING_EPSILON: 2e-7, // NOTE: 1e-7 doesn't work in some edge-cases!
		/**
		 * The epsilon to be used when performing "trigonometric" checks, such
		 * as examining cross products to check for collinearity.
		 */
		TRIGONOMETRIC_EPSILON: 1e-7,
		/**
		 * The epsilon to be used in the fat-line clipping code.
		 */
		CLIPPING_EPSILON: 1e-7,
		/**
		 * Kappa is the value which which to scale the curve handles when
		 * drawing a circle with bezier curves.
		 *
		 * http://whizkidtech.redprince.net/bezier/circle/
		 * http://www.whizkidtech.redprince.net/bezier/circle/kappa/
		 */
		KAPPA: 4 * (sqrt(2) - 1) / 3,

		/**
		 * Checks if the value is 0, within a tolerance defined by
		 * Numerical.EPSILON.
		 */
		isZero: function(val) {
			return val >= -EPSILON && val <= EPSILON;
		},

		/**
		 * Gauss-Legendre Numerical Integration.
		 */
		integrate: function(f, a, b, n) {
			var x = abscissas[n - 2],
				w = weights[n - 2],
				A = (b - a) * 0.5,
				B = A + a,
				i = 0,
				m = (n + 1) >> 1,
				sum = n & 1 ? w[i++] * f(B) : 0; // Handle odd n
			while (i < m) {
				var Ax = A * x[i];
				sum += w[i++] * (f(B + Ax) + f(B - Ax));
			}
			return A * sum;
		},

		/**
		 * Root finding using Newton-Raphson Method combined with Bisection.
		 */
		findRoot: function(f, df, x, a, b, n, tolerance) {
			for (var i = 0; i < n; i++) {
				var fx = f(x),
					// Calculate a new candidate with the Newton-Raphson method.
					dx = fx / df(x),
					nx = x - dx;
				// See if we can trust the Newton-Raphson result. If not we use
				// bisection to find another candidate for Newton's method.
				if (abs(dx) < tolerance)
					return nx;
				// Update the root-bounding interval and test for containment of
				// the candidate. If candidate is outside the root-bounding
				// interval, use bisection instead.
				// There is no need to compare to lower / upper because the
				// tangent line has positive slope, guaranteeing that the x-axis
				// intercept is larger than lower / smaller than upper.
				if (fx > 0) {
					b = x;
					x = nx <= a ? (a + b) * 0.5 : nx;
				} else {
					a = x;
					x = nx >= b ? (a + b) * 0.5 : nx;
				}
			}
			// Return the best result even though we haven't gotten close
			// enough to the root... (In paper.js this never seems to happen).
			return x;
		},

		/**
		 * Solve a quadratic equation in a numerically robust manner;
		 * given a quadratic equation  ax² + bx + c = 0, find the values of x.
		 *
		 * References:
		 *	Kahan W. - "To Solve a Real Cubic Equation"
		 *	http://www.cs.berkeley.edu/~wkahan/Math128/Cubic.pdf
		 *	Blinn J. - "How to solve a Quadratic Equation"
		 *
		 * @param {Number} a the quadratic term
		 * @param {Number} b the linear term
		 * @param {Number} c the constant term
		 * @param {Number[]} roots the array to store the roots in
		 * @param {Number} [min] the lower bound of the allowed roots
		 * @param {Number} [max] the upper bound of the allowed roots
		 * @return {Number} The number of real roots found, or -1 if there are
		 * infinite solutions
		 *
		 * @author Harikrishnan Gopalakrishnan
		 */
		solveQuadratic: function(a, b, c, roots, min, max) {
			var count = 0,
				eMin = min - EPSILON,
				eMax = max + EPSILON,
				x1, x2 = Infinity,
				B = b,
				D;
			// a, b, c are expected to be the coefficients of the equation:
			// Ax² - 2Bx + C == 0, so we take b = -B/2:
			b /= -2;
			D = b * b - a * c; // Discriminant
			// If the discriminant is very small, we can try to pre-condition
			// the coefficients, so that we may get better accuracy
			if (D !== 0 && abs(D) < MACHINE_EPSILON) {
				// If the geometric mean of the coefficients is small enough
				var gmC = pow(abs(a * b * c), 1 / 3);
				if (gmC < 1e-8) {
					// We multiply with a factor to normalize the coefficients.
					// The factor is just the nearest exponent of 10, big enough
					// to raise all the coefficients to nearly [-1, +1] range.
					var mult = pow(10,
							abs(Math.floor(Math.log(gmC) * Math.LOG10E)));
					if (!isFinite(mult))
						mult = 0;
					a *= mult;
					b *= mult;
					c *= mult;
					// Recalculate the discriminant
					D = b * b - a * c;
				}
			}
			if (abs(a) < EPSILON) {
				// This could just be a linear equation
				if (abs(B) < EPSILON)
					return abs(c) < EPSILON ? -1 : 0;
				x1 = -c / B;
			} else if (D >= -MACHINE_EPSILON) { // No real roots if D < 0
				var Q = D < 0 ? 0 : sqrt(D),
					R = b + (b < 0 ? -Q : Q);
				// Try to minimize floating point noise.
				if (R === 0) {
					x1 = c / a;
					x2 = -x1;
				} else {
					x1 = R / a;
					x2 = c / R;
				}
			}
			// We need to include EPSILON in the comparisons with min / max,
			// as some solutions are ever so lightly out of bounds.
			if (isFinite(x1) && (min == null || x1 > eMin && x1 < eMax))
				roots[count++] = min == null ? x1 : clip(x1, min, max);
			if (x2 !== x1
					&& isFinite(x2) && (min == null || x2 > eMin && x2 < eMax))
				roots[count++] = min == null ? x2 : clip(x2, min, max);
			return count;
		},

		/**
		 * Solve a cubic equation, using numerically stable methods,
		 * given an equation of the form ax³ + bx² + cx + d = 0.
		 *
		 * This algorithm avoids the trigonometric/inverse trigonometric
		 * calculations required by the "Italins"' formula. Cardano's method
		 * works well enough for exact computations, this method takes a
		 * numerical approach where the double precision error bound is kept
		 * very low.
		 *
		 * References:
		 *	Kahan W. - "To Solve a Real Cubic Equation"
		 *	 http://www.cs.berkeley.edu/~wkahan/Math128/Cubic.pdf
		 *
		 * W. Kahan's paper contains inferences on accuracy of cubic
		 * zero-finding methods. Also testing methods for robustness.
		 *
		 * @param {Number} a the cubic term (x³ term)
		 * @param {Number} b the quadratic term (x² term)
		 * @param {Number} c the linear term (x term)
		 * @param {Number} d the constant term
		 * @param {Number[]} roots the array to store the roots in
		 * @param {Number} [min] the lower bound of the allowed roots
		 * @param {Number} [max] the upper bound of the allowed roots
		 * @return {Number} the number of real roots found, or -1 if there are
		 * infinite solutions
		 *
		 * @author Harikrishnan Gopalakrishnan
		 */
		solveCubic: function(a, b, c, d, roots, min, max) {
			var count = 0,
				x, b1, c2;
			// If a or d is zero, we only need to solve a quadratic, so we set
			// the coefficients appropriately.
			if (abs(a) < EPSILON) {
				a = b;
				b1 = c;
				c2 = d;
				x = Infinity;
			} else if (abs(d) < EPSILON) {
				b1 = b;
				c2 = c;
				x = 0;
			} else {
				var ec = 1 + MACHINE_EPSILON, // 1.000...002
					x0, q, qd, t, r, s, tmp;
				// Here onwards we iterate for the leftmost root. Proceed to
				// deflate the cubic into a quadratic (as a side effect to the
				// iteration) and solve the quadratic.
				x = -(b / a) / 3;
				// Evaluate q, q', b1 and c2 at x
				tmp = a * x,
				b1 = tmp + b,
				c2 = b1 * x + c,
				qd = (tmp + b1) * x + c2,
				q = c2 * x + d;
				// Get a good initial approximation.
				t = q /a;
				r = pow(abs(t), 1/3);
				s = t < 0 ? -1 : 1;
				t = -qd / a;
				// See Kahan's notes on why 1.324718*... works.
				r = t > 0 ? 1.3247179572 * Math.max(r, sqrt(t)) : r;
				x0 = x - s * r;
				if (x0 !== x) {
					do {
						x = x0;
						// Evaluate q, q', b1 and c2 at x
						tmp = a * x,
						b1 = tmp + b,
						c2 = b1 * x + c,
						qd = (tmp + b1) * x + c2,
						q = c2 * x + d;
						// Newton's. Divide by ec to avoid x0 crossing over a
						// root.
						x0 = qd === 0 ? x : x - q / qd / ec;
						if (x0 === x) {
							x = x0;
							break;
						}
					} while (s * x0 > s * x);
					// Adjust the coefficients for the quadratic.
					if (abs(a) * x * x > abs(d / x)) {
						c2 = -d / x;
						b1 = (c2 - c) / x;
					}
				}
			}
			// The cubic has been deflated to a quadratic.
			var count = Numerical.solveQuadratic(a, b1, c2, roots, min, max);
			if (isFinite(x) && (count === 0 || x !== roots[count - 1])
					&& (min == null || x > min - EPSILON && x < max + EPSILON))
				roots[count++] = min == null ? x : clip(x, min, max);
			return count;
		}
	};
};

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
 * @name UID
 * @namespace
 * @private
 */
var UID = {
	_id: 1,
	_pools: {},

	/**
	 * Returns the next unique id.
	 * @method get
	 * @return {Number} The next unique id
	 * @static
	 **/
	get: function(ctor) {
		if (ctor) {
			// Use one UID pool per given constructor
			var name = ctor._class,
				pool = this._pools[name];
			if (!pool)
				pool = this._pools[name] = { _id: 1 };
			return pool._id++;
		} else {
			// Use the global UID pool:
			return this._id++;
		}
	}
};


// Include Paper classes, which are later injected into PaperScope by setting
// them on the 'this' object, e.g.:
// var Point = Base.extend(...);


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
 * @name Point
 *
 * @class The Point object represents a point in the two dimensional space
 * of the Paper.js project. It is also used to represent two dimensional
 * vector objects.
 *
 * @classexample
 * // Create a point at x: 10, y: 5
 * var point = new Point(10, 5);
 * console.log(point.x); // 10
 * console.log(point.y); // 5
 */
var Point = Base.extend(/** @lends Point# */{
	_class: 'Point',
	// Tell Base.read that the Point constructor supports reading with index
	_readIndex: true,

	/**
	 * Creates a Point object with the given x and y coordinates.
	 *
	 * @name Point#initialize
	 * @param {Number} x the x coordinate
	 * @param {Number} y the y coordinate
	 *
	 * @example
	 * // Create a point at x: 10, y: 5
	 * var point = new Point(10, 5);
	 * console.log(point.x); // 10
	 * console.log(point.y); // 5
	 */
	/**
	 * Creates a Point object using the numbers in the given array as
	 * coordinates.
	 *
	 * @name Point#initialize
	 * @param {array} array
	 *
	 * @example
	 * // Creating a point at x: 10, y: 5 using an array of numbers:
	 * var array = [10, 5];
	 * var point = new Point(array);
	 * console.log(point.x); // 10
	 * console.log(point.y); // 5
	 *
	 * @example
	 * // Passing an array to a functionality that expects a point:
	 *
	 * // Create a circle shaped path at x: 50, y: 50
	 * // with a radius of 30:
	 * var path = new Path.Circle([50, 50], 30);
	 * path.fillColor = 'red';
	 *
	 * // Which is the same as doing:
	 * var path = new Path.Circle(new Point(50, 50), 30);
	 * path.fillColor = 'red';
	 */
	/**
	 * Creates a Point object using the properties in the given object.
	 *
	 * @name Point#initialize
	 * @param {Object} object the object describing the point's properties
	 *
	 * @example
	 * // Creating a point using an object literal with length and angle
	 * // properties:
	 *
	 * var point = new Point({
	 *	   length: 10,
	 *	   angle: 90
	 * });
	 * console.log(point.length); // 10
	 * console.log(point.angle); // 90
	 *
	 * @example
	 * // Creating a point at x: 10, y: 20 using an object literal:
	 *
	 * var point = new Point({
	 *	   x: 10,
	 *	   y: 20
	 * });
	 * console.log(point.x); // 10
	 * console.log(point.y); // 20
	 *
	 * @example
	 * // Passing an object to a functionality that expects a point:
	 *
	 * var center = {
	 *	   x: 50,
	 *	   y: 50
	 * };
	 *
	 * // Creates a circle shaped path at x: 50, y: 50
	 * // with a radius of 30:
	 * var path = new Path.Circle(center, 30);
	 * path.fillColor = 'red';
	 */
	/**
	 * Creates a Point object using the width and height values of the given
	 * Size object.
	 *
	 * @name Point#initialize
	 * @param {Size} size
	 *
	 * @example
	 * // Creating a point using a size object.
	 *
	 * // Create a Size with a width of 100pt and a height of 50pt
	 * var size = new Size(100, 50);
	 * console.log(size); // { width: 100, height: 50 }
	 * var point = new Point(size);
	 * console.log(point); // { x: 100, y: 50 }
	 */
	/**
	 * Creates a Point object using the coordinates of the given Point object.
	 *
	 * @param {Point} point
	 * @name Point#initialize
	 */
	initialize: function Point(arg0, arg1) {
		var type = typeof arg0;
		if (type === 'number') {
			var hasY = typeof arg1 === 'number';
			this.x = arg0;
			this.y = hasY ? arg1 : arg0;
			if (this.__read)
				this.__read = hasY ? 2 : 1;
		} else if (type === 'undefined' || arg0 === null) {
			this.x = this.y = 0;
			if (this.__read)
				this.__read = arg0 === null ? 1 : 0;
		} else {
			if (Array.isArray(arg0)) {
				this.x = arg0[0];
				this.y = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (arg0.x != null) {
				this.x = arg0.x;
				this.y = arg0.y;
			} else if (arg0.width != null) {
				this.x = arg0.width;
				this.y = arg0.height;
			} else if (arg0.angle != null) {
				this.x = arg0.length;
				this.y = 0;
				this.setAngle(arg0.angle);
			} else {
				this.x = this.y = 0;
				if (this.__read)
					this.__read = 0;
			}
			if (this.__read)
				this.__read = 1;
		}
	},

	/**
	 * The x coordinate of the point
	 *
	 * @name Point#x
	 * @type Number
	 */

	/**
	 * The y coordinate of the point
	 *
	 * @name Point#y
	 * @type Number
	 */

	set: function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	},

	/**
	 * Checks whether the coordinates of the point are equal to that of the
	 * supplied point.
	 *
	 * @param {Point} point
	 * @return {Boolean} {@true if the points are equal}
	 *
	 * @example
	 * var point = new Point(5, 10);
	 * console.log(point == new Point(5, 10)); // true
	 * console.log(point == new Point(1, 1)); // false
	 * console.log(point != new Point(1, 1)); // true
	 */
	equals: function(point) {
		return this === point || point
				&& (this.x === point.x && this.y === point.y
					|| Array.isArray(point)
						&& this.x === point[0] && this.y === point[1])
				|| false;
	},

	/**
	 * Returns a copy of the point.
	 *
	 * @example
	 * var point1 = new Point();
	 * var point2 = point1;
	 * point2.x = 1; // also changes point1.x
	 *
	 * var point2 = point1.clone();
	 * point2.x = 1; // doesn't change point1.x
	 *
	 * @return {Point} the cloned point
	 */
	clone: function() {
		return new Point(this.x, this.y);
	},

	/**
	 * @return {String} a string representation of the point
	 */
	toString: function() {
		var f = Formatter.instance;
		return '{ x: ' + f.number(this.x) + ', y: ' + f.number(this.y) + ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		// For speed reasons, we directly call formatter.number() here, instead
		// of converting array through Base.serialize() which makes a copy.
		return [f.number(this.x), f.number(this.y)];
	},

	/**
	 * The length of the vector that is represented by this point's coordinates.
	 * Each point can be interpreted as a vector that points from the origin
	 * ({@code x = 0}, {@code y = 0}) to the point's location.
	 * Setting the length changes the location but keeps the vector's angle.
	 *
	 * @type Number
	 * @bean
	 */
	getLength: function() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	},

	setLength: function(length) {
		// Whenever chaining both x & y, use #set() instead of direct
		// assignment, so LinkedPoint does not report changes twice.
		if (this.isZero()) {
			var angle = this._angle || 0;
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		} else {
			var scale = length / this.getLength();
			// Force calculation of angle now, so it will be preserved even when
			// x and y are 0
			if (Numerical.isZero(scale))
				this.getAngle();
			this.set(
				this.x * scale,
				this.y * scale
			);
		}
	},
	/**
	 * Returns the smaller angle between two vectors. The angle is unsigned, no
	 * information about rotational direction is given.
	 *
	 * @name Point#getAngle
	 * @function
	 * @param {Point} point
	 * @return {Number} the angle in degrees
	 */
	/**
	 * The vector's angle in degrees, measured from the x-axis to the vector.
	 *
	 * @name Point#getAngle
	 * @bean
	 * @type Number
	 */
	getAngle: function(/* point */) {
		return this.getAngleInRadians.apply(this, arguments) * 180 / Math.PI;
	},

	setAngle: function(angle) {
		this.setAngleInRadians.call(this, angle * Math.PI / 180);
	},

	getAngleInDegrees: '#getAngle',
	setAngleInDegrees: '#setAngle',

	/**
	 * Returns the smaller angle between two vectors in radians. The angle is
	 * unsigned, no information about rotational direction is given.
	 *
	 * @name Point#getAngleInRadians
	 * @function
	 * @param {Point} point
	 * @return {Number} the angle in radians
	 */
	/**
	 * The vector's angle in radians, measured from the x-axis to the vector.
	 *
	 * @name Point#getAngleInRadians
	 * @bean
	 * @type Number
	 */
	getAngleInRadians: function(/* point */) {
		if (!arguments.length) {
			return this.isZero()
					// Return the preserved angle in case the vector has no
					// length, and update the internal _angle in case the
					// vector has a length. See #setAngle() for more
					// explanations.
					? this._angle || 0
					: this._angle = Math.atan2(this.y, this.x);
		} else {
			var point = Point.read(arguments),
				div = this.getLength() * point.getLength();
			if (Numerical.isZero(div)) {
				return NaN;
			} else {
				var a = this.dot(point) / div;
				return Math.acos(a < -1 ? -1 : a > 1 ? 1 : a);
			}
		}
	},

	setAngleInRadians: function(angle) {
		// We store a reference to _angle internally so we still preserve it
		// when the vector's length is set to zero, and then anything else.
		// Note that we cannot rely on it if x and y are something else than 0,
		// since updating x / y does not automatically change _angle!
		this._angle = angle;
		if (!this.isZero()) {
			var length = this.getLength();
			// Use #set() instead of direct assignment of x/y, so LinkedPoint
			// does not report changes twice.
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		}
	},

	/**
	 * The quadrant of the {@link #angle} of the point.
	 *
	 * Angles between 0 and 90 degrees are in quadrant {@code 1}. Angles between
	 * 90 and 180 degrees are in quadrant {@code 2}, angles between 180 and 270
	 * degrees are in quadrant {@code 3} and angles between 270 and 360 degrees
	 * are in quadrant {@code 4}.
	 *
	 * @type Number
	 * @bean
	 *
	 * @example
	 * var point = new Point({
	 *	   angle: 10,
	 *	   length: 20
	 * });
	 * console.log(point.quadrant); // 1
	 *
	 * point.angle = 100;
	 * console.log(point.quadrant); // 2
	 *
	 * point.angle = 190;
	 * console.log(point.quadrant); // 3
	 *
	 * point.angle = 280;
	 * console.log(point.quadrant); // 4
	 */
	getQuadrant: function() {
		return this.x >= 0 ? this.y >= 0 ? 1 : 4 : this.y >= 0 ? 2 : 3;
	}
}, /** @lends Point# */{
	// Explicitly deactivate the creation of beans, as we have functions here
	// that look like bean getters but actually read arguments.
	// See #getDirectedAngle(), #getDistance()
	beans: false,

	/**
	 * Returns the angle between two vectors. The angle is directional and
	 * signed, giving information about the rotational direction.
	 *
	 * Read more about angle units and orientation in the description of the
	 * {@link #angle} property.
	 *
	 * @param {Point} point
	 * @return {Number} the angle between the two vectors
	 */
	getDirectedAngle: function(/* point */) {
		var point = Point.read(arguments);
		return Math.atan2(this.cross(point), this.dot(point)) * 180 / Math.PI;
	},

	/**
	 * Returns the distance between the point and another point.
	 *
	 * @param {Point} point
	 * @param {Boolean} [squared=false] Controls whether the distance should
	 * remain squared, or its square root should be calculated
	 * @return {Number}
	 */
	getDistance: function(/* point, squared */) {
		var point = Point.read(arguments),
			x = point.x - this.x,
			y = point.y - this.y,
			d = x * x + y * y,
			squared = Base.read(arguments);
		return squared ? d : Math.sqrt(d);
	},

	/**
	 * Normalize modifies the {@link #length} of the vector to {@code 1} without
	 * changing its angle and returns it as a new point. The optional
	 * {@code length} parameter defines the length to normalize to.
	 * The object itself is not modified!
	 *
	 * @param {Number} [length=1] The length of the normalized vector
	 * @return {Point} the normalized vector of the vector that is represented
	 * by this point's coordinates
	 */
	normalize: function(length) {
		if (length === undefined)
			length = 1;
		var current = this.getLength(),
			scale = current !== 0 ? length / current : 0,
			point = new Point(this.x * scale, this.y * scale);
		// Preserve angle.
		if (scale >= 0)
			point._angle = this._angle;
		return point;
	},

	/**
	 * Rotates the point by the given angle around an optional center point.
	 * The object itself is not modified.
	 *
	 * Read more about angle units and orientation in the description of the
	 * {@link #angle} property.
	 *
	 * @param {Number} angle the rotation angle
	 * @param {Point} center the center point of the rotation
	 * @return {Point} the rotated point
	 */
	rotate: function(angle, center) {
		if (angle === 0)
			return this.clone();
		angle = angle * Math.PI / 180;
		var point = center ? this.subtract(center) : this,
			sin = Math.sin(angle),
			cos = Math.cos(angle);
		point = new Point(
			point.x * cos - point.y * sin,
			point.x * sin + point.y * cos
		);
		return center ? point.add(center) : point;
	},

	/**
	 * Transforms the point by the matrix as a new point. The object itself is
	 * not modified!
	 *
	 * @param {Matrix} matrix
	 * @return {Point} the transformed point
	 */
	transform: function(matrix) {
		return matrix ? matrix._transformPoint(this) : this;
	},

	/**
	 * Returns the addition of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#add
	 * @function
	 * @operator
	 * @param {Number} number the number to add
	 * @return {Point} the addition of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(5, 10);
	 * var result = point + 20;
	 * console.log(result); // {x: 25, y: 30}
	 */
	/**
	 * Returns the addition of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#add
	 * @function
	 * @operator
	 * @param {Point} point the point to add
	 * @return {Point} the addition of the two points as a new point
	 *
	 * @example
	 * var point1 = new Point(5, 10);
	 * var point2 = new Point(10, 20);
	 * var result = point1 + point2;
	 * console.log(result); // {x: 15, y: 30}
	 */
	add: function(/* point */) {
		var point = Point.read(arguments);
		return new Point(this.x + point.x, this.y + point.y);
	},

	/**
	 * Returns the subtraction of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#subtract
	 * @function
	 * @operator
	 * @param {Number} number the number to subtract
	 * @return {Point} the subtraction of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point - 5;
	 * console.log(result); // {x: 5, y: 15}
	 */
	/**
	 * Returns the subtraction of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#subtract
	 * @function
	 * @operator
	 * @param {Point} point the point to subtract
	 * @return {Point} the subtraction of the two points as a new point
	 *
	 * @example
	 * var firstPoint = new Point(10, 20);
	 * var secondPoint = new Point(5, 5);
	 * var result = firstPoint - secondPoint;
	 * console.log(result); // {x: 5, y: 15}
	 */
	subtract: function(/* point */) {
		var point = Point.read(arguments);
		return new Point(this.x - point.x, this.y - point.y);
	},

	/**
	 * Returns the multiplication of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#multiply
	 * @function
	 * @operator
	 * @param {Number} number the number to multiply by
	 * @return {Point} the multiplication of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point * 2;
	 * console.log(result); // {x: 20, y: 40}
	 */
	/**
	 * Returns the multiplication of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#multiply
	 * @function
	 * @operator
	 * @param {Point} point the point to multiply by
	 * @return {Point} the multiplication of the two points as a new point
	 *
	 * @example
	 * var firstPoint = new Point(5, 10);
	 * var secondPoint = new Point(4, 2);
	 * var result = firstPoint * secondPoint;
	 * console.log(result); // {x: 20, y: 20}
	 */
	multiply: function(/* point */) {
		var point = Point.read(arguments);
		return new Point(this.x * point.x, this.y * point.y);
	},

	/**
	 * Returns the division of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#divide
	 * @function
	 * @operator
	 * @param {Number} number the number to divide by
	 * @return {Point} the division of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point / 2;
	 * console.log(result); // {x: 5, y: 10}
	 */
	/**
	 * Returns the division of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#divide
	 * @function
	 * @operator
	 * @param {Point} point the point to divide by
	 * @return {Point} the division of the two points as a new point
	 *
	 * @example
	 * var firstPoint = new Point(8, 10);
	 * var secondPoint = new Point(2, 5);
	 * var result = firstPoint / secondPoint;
	 * console.log(result); // {x: 4, y: 2}
	 */
	divide: function(/* point */) {
		var point = Point.read(arguments);
		return new Point(this.x / point.x, this.y / point.y);
	},

	/**
	 * The modulo operator returns the integer remainders of dividing the point
	 * by the supplied value as a new point.
	 *
	 * @name Point#modulo
	 * @function
	 * @operator
	 * @param {Number} value
	 * @return {Point} the integer remainders of dividing the point by the value
	 * as a new point
	 *
	 * @example
	 * var point = new Point(12, 6);
	 * console.log(point % 5); // {x: 2, y: 1}
	 */
	/**
	 * The modulo operator returns the integer remainders of dividing the point
	 * by the supplied value as a new point.
	 *
	 * @name Point#modulo
	 * @function
	 * @operator
	 * @param {Point} point
	 * @return {Point} the integer remainders of dividing the points by each
	 * other as a new point
	 *
	 * @example
	 * var point = new Point(12, 6);
	 * console.log(point % new Point(5, 2)); // {x: 2, y: 0}
	 */
	modulo: function(/* point */) {
		var point = Point.read(arguments);
		return new Point(this.x % point.x, this.y % point.y);
	},

	negate: function() {
		return new Point(-this.x, -this.y);
	},

	/**
	 * {@grouptitle Tests}
	 *
	 * Checks whether the point is inside the boundaries of the rectangle.
	 *
	 * @param {Rectangle} rect the rectangle to check against
	 * @return {Boolean} {@true if the point is inside the rectangle}
	 */
	isInside: function(/* rect */) {
		return Rectangle.read(arguments).contains(this);
	},

	/**
	 * Checks if the point is within a given distance of another point.
	 *
	 * @param {Point} point the point to check against
	 * @param {Number} tolerance the maximum distance allowed
	 * @return {Boolean} {@true if it is within the given distance}
	 */
	isClose: function(/* point, tolerance */) {
		var point = Point.read(arguments),
			tolerance = Base.read(arguments);
		return this.getDistance(point) < tolerance;
	},

	/**
	 * Checks if the vector represented by this point is collinear (parallel) to
	 * another vector.
	 *
	 * @param {Point} point the vector to check against
	 * @return {Boolean} {@true it is collinear}
	 */
	isCollinear: function(/* point */) {
		var point = Point.read(arguments);
		return Point.isCollinear(this.x, this.y, point.x, point.y);
	},

	// TODO: Remove version with typo after a while (deprecated June 2015)
	isColinear: '#isCollinear',

	/**
	 * Checks if the vector represented by this point is orthogonal
	 * (perpendicular) to another vector.
	 *
	 * @param {Point} point the vector to check against
	 * @return {Boolean} {@true it is orthogonal}
	 */
	isOrthogonal: function(/* point */) {
		var point = Point.read(arguments);
		return Point.isOrthogonal(this.x, this.y, point.x, point.y);
	},

	/**
	 * Checks if this point has both the x and y coordinate set to 0.
	 *
	 * @return {Boolean} {@true if both x and y are 0}
	 */
	isZero: function() {
		return Numerical.isZero(this.x) && Numerical.isZero(this.y);
	},

	/**
	 * Checks if this point has an undefined value for at least one of its
	 * coordinates.
	 *
	 * @return {Boolean} {@true if either x or y are not a number}
	 */
	isNaN: function() {
		return isNaN(this.x) || isNaN(this.y);
	},

	/**
	 * {@grouptitle Vector Math Functions}
	 * Returns the dot product of the point and another point.
	 *
	 * @param {Point} point
	 * @return {Number} the dot product of the two points
	 */
	dot: function(/* point */) {
		var point = Point.read(arguments);
		return this.x * point.x + this.y * point.y;
	},

	/**
	 * Returns the cross product of the point and another point.
	 *
	 * @param {Point} point
	 * @return {Number} the cross product of the two points
	 */
	cross: function(/* point */) {
		var point = Point.read(arguments);
		return this.x * point.y - this.y * point.x;
	},

	/**
	 * Returns the projection of the point onto another point.
	 * Both points are interpreted as vectors.
	 *
	 * @param {Point} point
	 * @return {Point} the projection of the point onto another point
	 */
	project: function(/* point */) {
		var point = Point.read(arguments),
			scale = point.isZero() ? 0 : this.dot(point) / point.dot(point);
		return new Point(
			point.x * scale,
			point.y * scale
		);
	},

	/**
	 * This property is only present if the point is an anchor or control point
	 * of a {@link Segment} or a {@link Curve}. In this case, it returns
	 * {@true it is selected}
	 *
	 * @name Point#selected
	 * @property
	 * @return {Boolean} {@true if the point is selected}
	 */

	/**
	 * {@grouptitle Math Functions}
	 *
	 * Returns a new point with rounded {@link #x} and {@link #y} values. The
	 * object itself is not modified!
	 *
	 * @name Point#round
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var roundPoint = point.round();
	 * console.log(roundPoint); // {x: 10, y: 11}
	 */

	/**
	 * Returns a new point with the nearest greater non-fractional values to the
	 * specified {@link #x} and {@link #y} values. The object itself is not
	 * modified!
	 *
	 * @name Point#ceil
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var ceilPoint = point.ceil();
	 * console.log(ceilPoint); // {x: 11, y: 11}
	 */

	/**
	 * Returns a new point with the nearest smaller non-fractional values to the
	 * specified {@link #x} and {@link #y} values. The object itself is not
	 * modified!
	 *
	 * @name Point#floor
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var floorPoint = point.floor();
	 * console.log(floorPoint); // {x: 10, y: 10}
	 */

	/**
	 * Returns a new point with the absolute values of the specified {@link #x}
	 * and {@link #y} values. The object itself is not modified!
	 *
	 * @name Point#abs
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(-5, 10);
	 * var absPoint = point.abs();
	 * console.log(absPoint); // {x: 5, y: 10}
	 */
	statics: /** @lends Point */{
		/**
		 * Returns a new point object with the smallest {@link #x} and
		 * {@link #y} of the supplied points.
		 *
		 * @static
		 * @param {Point} point1
		 * @param {Point} point2
		 * @return {Point} the newly created point object
		 *
		 * @example
		 * var point1 = new Point(10, 100);
		 * var point2 = new Point(200, 5);
		 * var minPoint = Point.min(point1, point2);
		 * console.log(minPoint); // {x: 10, y: 5}
		 */
		min: function(/* point1, point2 */) {
			var point1 = Point.read(arguments),
				point2 = Point.read(arguments);
			return new Point(
				Math.min(point1.x, point2.x),
				Math.min(point1.y, point2.y)
			);
		},

		/**
		 * Returns a new point object with the largest {@link #x} and
		 * {@link #y} of the supplied points.
		 *
		 * @static
		 * @param {Point} point1
		 * @param {Point} point2
		 * @return {Point} the newly created point object
		 *
		 * @example
		 * var point1 = new Point(10, 100);
		 * var point2 = new Point(200, 5);
		 * var maxPoint = Point.max(point1, point2);
		 * console.log(maxPoint); // {x: 200, y: 100}
		 */
		max: function(/* point1, point2 */) {
			var point1 = Point.read(arguments),
				point2 = Point.read(arguments);
			return new Point(
				Math.max(point1.x, point2.x),
				Math.max(point1.y, point2.y)
			);
		},

		/**
		 * Returns a point object with random {@link #x} and {@link #y} values
		 * between {@code 0} and {@code 1}.
		 *
		 * @return {Point} the newly created point object
		 * @static
		 *
		 * @example
		 * var maxPoint = new Point(100, 100);
		 * var randomPoint = Point.random();
		 *
		 * // A point between {x:0, y:0} and {x:100, y:100}:
		 * var point = maxPoint * randomPoint;
		 */
		random: function() {
			return new Point(Math.random(), Math.random());
		},

		isCollinear: function(x1, y1, x2, y2) {
			// NOTE: We use normalized vectors so that the epsilon comparison is
			// reliable. We could instead scale the epsilon based on the vector
			// length. But instead of normalizing the vectors before calculating
			// the cross product, we can scale the epsilon accordingly.
			return Math.abs(x1 * y2 - y1 * x2)
					<= Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2))
						* 1e-7;
		},

		isOrthogonal: function(x1, y1, x2, y2) {
			// See Point.isCollinear()
			return Math.abs(x1 * x2 + y1 * y2)
					<= Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2))
						* 1e-7;
		}
	}
}, Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
	// Inject round, ceil, floor, abs:
	var op = Math[name];
	this[name] = function() {
		return new Point(op(this.x), op(this.y));
	};
}, {}));

/**
 * @name LinkedPoint
 *
 * @class An internal version of Point that notifies its owner of each change
 * through setting itself again on the setter that corresponds to the getter
 * that produced this LinkedPoint.
 * Note: This prototype is not exported.
 *
 * @ignore
 */
var LinkedPoint = Point.extend({
	// Have LinkedPoint appear as a normal Point in debugging
	initialize: function Point(x, y, owner, setter) {
		this._x = x;
		this._y = y;
		this._owner = owner;
		this._setter = setter;
	},

	set: function(x, y, _dontNotify) {
		this._x = x;
		this._y = y;
		if (!_dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner[this._setter](this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner[this._setter](this);
	}
});

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
 * @name Size
 *
 * @class The Size object is used to describe the size or dimensions of
 * something, through its {@link #width} and {@link #height} properties.
 *
 * @classexample
 * // Create a size that is 10pt wide and 5pt high,
 * // and use it to define a rectangle:
 * var size = new Size(10, 5);
 * console.log(size.width); // 10
 * console.log(size.height); // 5
 * var rect = new Rectangle(new Point(20, 15), size);
 * console.log(rect); // { x: 20, y: 15, width: 10, height: 5 }
 */
var Size = Base.extend(/** @lends Size# */{
	_class: 'Size',
	// Tell Base.read that the Point constructor supports reading with index
	_readIndex: true,

	/**
	 * Creates a Size object with the given width and height values.
	 *
	 * @name Size#initialize
	 * @param {Number} width the width
	 * @param {Number} height the height
	 *
	 * @example
	 * // Create a size that is 10pt wide and 5pt high
	 * var size = new Size(10, 5);
	 * console.log(size.width); // 10
	 * console.log(size.height); // 5
	 */
	/**
	 * Creates a Size object using the numbers in the given array as
	 * dimensions.
	 *
	 * @name Size#initialize
	 * @param {Array} array
	 *
	 * @example
	 * // Creating a size of width: 320, height: 240 using an array of numbers:
	 * var array = [320, 240];
	 * var size = new Size(array);
	 * console.log(size.width); // 320
	 * console.log(size.height); // 240
	 */
	/**
	 * Creates a Size object using the properties in the given object.
	 *
	 * @name Size#initialize
	 * @param {Object} object
	 *
	 * @example
	 * // Creating a size of width: 10, height: 20 using an object literal:
	 *
	 * var size = new Size({
	 *	   width: 10,
	 *	   height: 20
	 * });
	 * console.log(size.width); // 10
	 * console.log(size.height); // 20
	 */
	/**
	 * Creates a Size object using the coordinates of the given Size object.
	 *
	 * @name Size#initialize
	 * @param {Size} size
	 */
	/**
	 * Creates a Size object using the {@link Point#x} and {@link Point#y}
	 * values of the given Point object.
	 *
	 * @name Size#initialize
	 * @param {Point} point
	 *
	 * @example
	 * var point = new Point(50, 50);
	 * var size = new Size(point);
	 * console.log(size.width); // 50
	 * console.log(size.height); // 50
	 */
	initialize: function Size(arg0, arg1) {
		var type = typeof arg0;
		if (type === 'number') {
			var hasHeight = typeof arg1 === 'number';
			this.width = arg0;
			this.height = hasHeight ? arg1 : arg0;
			if (this.__read)
				this.__read = hasHeight ? 2 : 1;
		} else if (type === 'undefined' || arg0 === null) {
			this.width = this.height = 0;
			if (this.__read)
				this.__read = arg0 === null ? 1 : 0;
		} else {
			if (Array.isArray(arg0)) {
				this.width = arg0[0];
				this.height = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (arg0.width != null) {
				this.width = arg0.width;
				this.height = arg0.height;
			} else if (arg0.x != null) {
				this.width = arg0.x;
				this.height = arg0.y;
			} else {
				this.width = this.height = 0;
				if (this.__read)
					this.__read = 0;
			}
			if (this.__read)
				this.__read = 1;
		}
	},

	/**
	 * The width of the size
	 *
	 * @name Size#width
	 * @type Number
	 */

	/**
	 * The height of the size
	 *
	 * @name Size#height
	 * @type Number
	 */

	set: function(width, height) {
		this.width = width;
		this.height = height;
		return this;
	},

	/**
	 * Checks whether the width and height of the size are equal to those of the
	 * supplied size.
	 *
	 * @param {Size}
	 * @return {Boolean}
	 *
	 * @example
	 * var size = new Size(5, 10);
	 * console.log(size == new Size(5, 10)); // true
	 * console.log(size == new Size(1, 1)); // false
	 * console.log(size != new Size(1, 1)); // true
	 */
	equals: function(size) {
		return size === this || size && (this.width === size.width
				&& this.height === size.height
				|| Array.isArray(size) && this.width === size[0]
					&& this.height === size[1]) || false;
	},

	/**
	 * Returns a copy of the size.
	 */
	clone: function() {
		return new Size(this.width, this.height);
	},

	/**
	 * @return {String} a string representation of the size
	 */
	toString: function() {
		var f = Formatter.instance;
		return '{ width: ' + f.number(this.width)
				+ ', height: ' + f.number(this.height) + ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		// See Point#_serialize()
		return [f.number(this.width),
				f.number(this.height)];
	},

	/**
	 * Returns the addition of the supplied value to the width and height of the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#add
	 * @function
	 * @operator
	 * @param {Number} number the number to add
	 * @return {Size} the addition of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(5, 10);
	 * var result = size + 20;
	 * console.log(result); // {width: 25, height: 30}
	 */
	/**
	 * Returns the addition of the width and height of the supplied size to the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#add
	 * @function
	 * @operator
	 * @param {Size} size the size to add
	 * @return {Size} the addition of the two sizes as a new size
	 *
	 * @example
	 * var size1 = new Size(5, 10);
	 * var size2 = new Size(10, 20);
	 * var result = size1 + size2;
	 * console.log(result); // {width: 15, height: 30}
	 */
	add: function(/* size */) {
		var size = Size.read(arguments);
		return new Size(this.width + size.width, this.height + size.height);
	},

	/**
	 * Returns the subtraction of the supplied value from the width and height
	 * of the size as a new size. The object itself is not modified!
	 * The object itself is not modified!
	 *
	 * @name Size#subtract
	 * @function
	 * @operator
	 * @param {Number} number the number to subtract
	 * @return {Size} the subtraction of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size - 5;
	 * console.log(result); // {width: 5, height: 15}
	 */
	/**
	 * Returns the subtraction of the width and height of the supplied size from
	 * the size as a new size. The object itself is not modified!
	 *
	 * @name Size#subtract
	 * @function
	 * @operator
	 * @param {Size} size the size to subtract
	 * @return {Size} the subtraction of the two sizes as a new size
	 *
	 * @example
	 * var firstSize = new Size(10, 20);
	 * var secondSize = new Size(5, 5);
	 * var result = firstSize - secondSize;
	 * console.log(result); // {width: 5, height: 15}
	 */
	subtract: function(/* size */) {
		var size = Size.read(arguments);
		return new Size(this.width - size.width, this.height - size.height);
	},

	/**
	 * Returns the multiplication of the supplied value with the width and
	 * height of the size as a new size. The object itself is not modified!
	 *
	 * @name Size#multiply
	 * @function
	 * @operator
	 * @param {Number} number the number to multiply by
	 * @return {Size} the multiplication of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size * 2;
	 * console.log(result); // {width: 20, height: 40}
	 */
	/**
	 * Returns the multiplication of the width and height of the supplied size
	 * with the size as a new size. The object itself is not modified!
	 *
	 * @name Size#multiply
	 * @function
	 * @operator
	 * @param {Size} size the size to multiply by
	 * @return {Size} the multiplication of the two sizes as a new size
	 *
	 * @example
	 * var firstSize = new Size(5, 10);
	 * var secondSize = new Size(4, 2);
	 * var result = firstSize * secondSize;
	 * console.log(result); // {width: 20, height: 20}
	 */
	multiply: function(/* size */) {
		var size = Size.read(arguments);
		return new Size(this.width * size.width, this.height * size.height);
	},

	/**
	 * Returns the division of the supplied value by the width and height of the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#divide
	 * @function
	 * @operator
	 * @param {Number} number the number to divide by
	 * @return {Size} the division of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size / 2;
	 * console.log(result); // {width: 5, height: 10}
	 */
	/**
	 * Returns the division of the width and height of the supplied size by the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#divide
	 * @function
	 * @operator
	 * @param {Size} size the size to divide by
	 * @return {Size} the division of the two sizes as a new size
	 *
	 * @example
	 * var firstSize = new Size(8, 10);
	 * var secondSize = new Size(2, 5);
	 * var result = firstSize / secondSize;
	 * console.log(result); // {width: 4, height: 2}
	 */
	divide: function(/* size */) {
		var size = Size.read(arguments);
		return new Size(this.width / size.width, this.height / size.height);
	},

	/**
	 * The modulo operator returns the integer remainders of dividing the size
	 * by the supplied value as a new size.
	 *
	 * @name Size#modulo
	 * @function
	 * @operator
	 * @param {Number} value
	 * @return {Size} the integer remainders of dividing the size by the value
	 * as a new size
	 *
	 * @example
	 * var size = new Size(12, 6);
	 * console.log(size % 5); // {width: 2, height: 1}
	 */
	/**
	 * The modulo operator returns the integer remainders of dividing the size
	 * by the supplied size as a new size.
	 *
	 * @name Size#modulo
	 * @function
	 * @operator
	 * @param {Size} size
	 * @return {Size} the integer remainders of dividing the sizes by each
	 * other as a new size
	 *
	 * @example
	 * var size = new Size(12, 6);
	 * console.log(size % new Size(5, 2)); // {width: 2, height: 0}
	 */
	modulo: function(/* size */) {
		var size = Size.read(arguments);
		return new Size(this.width % size.width, this.height % size.height);
	},

	negate: function() {
		return new Size(-this.width, -this.height);
	},

	/**
	 * {@grouptitle Tests}
	 * Checks if this size has both the width and height set to 0.
	 *
	 * @return {Boolean} {@true if both width and height are 0}
	 */
	isZero: function() {
		return Numerical.isZero(this.width) && Numerical.isZero(this.height);
	},

	/**
	 * Checks if the width or the height of the size are NaN.
	 *
	 * @return {Boolean} {@true if the width or height of the size are NaN}
	 */
	isNaN: function() {
		return isNaN(this.width) || isNaN(this.height);
	},

	/**
	 * {@grouptitle Math Functions}
	 *
	 * Returns a new size with rounded {@link #width} and {@link #height}
	 * values. The object itself is not modified!
	 *
	 * @name Size#round
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var roundSize = size.round();
	 * console.log(roundSize); // {x: 10, y: 11}
	 */

	/**
	 * Returns a new size with the nearest greater non-fractional values to the
	 * specified {@link #width} and {@link #height} values. The object itself is
	 * not modified!
	 *
	 * @name Size#ceil
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var ceilSize = size.ceil();
	 * console.log(ceilSize); // {x: 11, y: 11}
	 */

	/**
	 * Returns a new size with the nearest smaller non-fractional values to the
	 * specified {@link #width} and {@link #height} values. The object itself is
	 * not modified!
	 *
	 * @name Size#floor
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var floorSize = size.floor();
	 * console.log(floorSize); // {x: 10, y: 10}
	 */

	/**
	 * Returns a new size with the absolute values of the specified
	 * {@link #width} and {@link #height} values. The object itself is not
	 * modified!
	 *
	 * @name Size#abs
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(-5, 10);
	 * var absSize = size.abs();
	 * console.log(absSize); // {x: 5, y: 10}
	 */

	statics: /** @lends Size */{
		/**
		 * Returns a new size object with the smallest {@link #width} and
		 * {@link #height} of the supplied sizes.
		 *
		 * @static
		 * @param {Size} size1
		 * @param {Size} size2
		 * @return {Size} the newly created size object
		 *
		 * @example
		 * var size1 = new Size(10, 100);
		 * var size2 = new Size(200, 5);
		 * var minSize = Size.min(size1, size2);
		 * console.log(minSize); // {width: 10, height: 5}
		 */
		min: function(size1, size2) {
			return new Size(
				Math.min(size1.width, size2.width),
				Math.min(size1.height, size2.height));
		},

		/**
		 * Returns a new size object with the largest {@link #width} and
		 * {@link #height} of the supplied sizes.
		 *
		 * @static
		 * @param {Size} size1
		 * @param {Size} size2
		 * @return {Size} the newly created size object
		 *
		 * @example
		 * var size1 = new Size(10, 100);
		 * var size2 = new Size(200, 5);
		 * var maxSize = Size.max(size1, size2);
		 * console.log(maxSize); // {width: 200, height: 100}
		 */
		max: function(size1, size2) {
			return new Size(
				Math.max(size1.width, size2.width),
				Math.max(size1.height, size2.height));
		},

		/**
		 * Returns a size object with random {@link #width} and {@link #height}
		 * values between {@code 0} and {@code 1}.
		 *
		 * @return {Size} the newly created size object
		 * @static
		 *
		 * @example
		 * var maxSize = new Size(100, 100);
		 * var randomSize = Size.random();
		 * var size = maxSize * randomSize;
		 */
		random: function() {
			return new Size(Math.random(), Math.random());
		}
	}
}, Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
	// Inject round, ceil, floor, abs:
	var op = Math[name];
	this[name] = function() {
		return new Size(op(this.width), op(this.height));
	};
}, {}));

/**
 * @name LinkedSize
 *
 * @class An internal version of Size that notifies its owner of each change
 * through setting itself again on the setter that corresponds to the getter
 * that produced this LinkedSize.
 * Note: This prototype is not exported.
 *
 * @private
 */
var LinkedSize = Size.extend({
	// Have LinkedSize appear as a normal Size in debugging
	initialize: function Size(width, height, owner, setter) {
		this._width = width;
		this._height = height;
		this._owner = owner;
		this._setter = setter;
	},

	set: function(width, height, _dontNotify) {
		this._width = width;
		this._height = height;
		if (!_dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getWidth: function() {
		return this._width;
	},

	setWidth: function(width) {
		this._width = width;
		this._owner[this._setter](this);
	},

	getHeight: function() {
		return this._height;
	},

	setHeight: function(height) {
		this._height = height;
		this._owner[this._setter](this);
	}
});

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
 * @name Rectangle
 *
 * @class A Rectangle specifies an area that is enclosed by it's top-left
 * point (x, y), its width, and its height. It should not be confused with a
 * rectangular path, it is not an item.
 */
var Rectangle = Base.extend(/** @lends Rectangle# */{
	_class: 'Rectangle',
	// Tell Base.read that the Rectangle constructor supports reading with index
	_readIndex: true,
	// Enforce creation of beans, as bean getters have hidden parameters.
	// See	#getPoint() below.
	beans: true,

	/**
	 * Creates a Rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Point} point the top-left point of the rectangle
	 * @param {Size} size the size of the rectangle
	 */
	/**
	 * Creates a Rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Object} object an object containing properties to be set on the
	 * rectangle
	 *
	 * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
	 * var rectangle = new Rectangle({
	 *	   point: [20, 20],
	 *	   size: [60, 60]
	 * });
	 *
	 * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
	 * var rectangle = new Rectangle({
	 *	   from: [20, 20],
	 *	   to: [80, 80]
	 * });
	 */
	/**
	 * Creates a rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Number} x the left coordinate
	 * @param {Number} y the top coordinate
	 * @param {Number} width
	 * @param {Number} height
	 */
	/**
	 * Creates a rectangle object from the passed points. These do not
	 * necessarily need to be the top left and bottom right corners, the
	 * constructor figures out how to fit a rectangle between them.
	 *
	 * @name Rectangle#initialize
	 * @param {Point} from The first point defining the rectangle
	 * @param {Point} to The second point defining the rectangle
	 */
	/**
	 * Creates a new rectangle object from the passed rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Rectangle} rt
	 */
	initialize: function Rectangle(arg0, arg1, arg2, arg3) {
		var type = typeof arg0,
			read = 0;
		if (type === 'number') {
			// new Rectangle(x, y, width, height)
			this.x = arg0;
			this.y = arg1;
			this.width = arg2;
			this.height = arg3;
			read = 4;
		} else if (type === 'undefined' || arg0 === null) {
			// new Rectangle(), new Rectangle(null)
			this.x = this.y = this.width = this.height = 0;
			read = arg0 === null ? 1 : 0;
		} else if (arguments.length === 1) {
			// This can either be an array, or an object literal.
			if (Array.isArray(arg0)) {
				this.x = arg0[0];
				this.y = arg0[1];
				this.width = arg0[2];
				this.height = arg0[3];
				read = 1;
			} else if (arg0.x !== undefined || arg0.width !== undefined) {
				// Another rectangle or a simple object literal
				// describing one. Use duck typing, and 0 as defaults.
				this.x = arg0.x || 0;
				this.y = arg0.y || 0;
				this.width = arg0.width || 0;
				this.height = arg0.height || 0;
				read = 1;
			} else if (arg0.from === undefined && arg0.to === undefined) {
				// Use #_set to support whatever property the rectangle can
				// take, but handle from/to separately below.
				this.x = this.y = this.width = this.height = 0;
				this._set(arg0);
				read = 1;
			}
		}
		if (!read) {
			// Read a point argument and look at the next value to see whether
			// it's a size or a point, then read accordingly.
			// We're supporting both reading from a normal arguments list and
			// covering the Rectangle({ from: , to: }) constructor, through
			// Point.readNamed().
			var point = Point.readNamed(arguments, 'from'),
				next = Base.peek(arguments);
			this.x = point.x;
			this.y = point.y;
			if (next && next.x !== undefined || Base.hasNamed(arguments, 'to')) {
				// new Rectangle(from, to)
				// Read above why we can use readNamed() to cover both cases.
				var to = Point.readNamed(arguments, 'to');
				this.width = to.x - point.x;
				this.height = to.y - point.y;
				// Check if horizontal or vertical order needs to be reversed.
				if (this.width < 0) {
					this.x = to.x;
					this.width = -this.width;
				}
				if (this.height < 0) {
					this.y = to.y;
					this.height = -this.height;
				}
			} else {
				// new Rectangle(point, size)
				var size = Size.read(arguments);
				this.width = size.width;
				this.height = size.height;
			}
			read = arguments.__index;
		}
		if (this.__read)
			this.__read = read;
	},

	/**
	 * The x position of the rectangle.
	 *
	 * @name Rectangle#x
	 * @type Number
	 */

	/**
	 * The y position of the rectangle.
	 *
	 * @name Rectangle#y
	 * @type Number
	 */

	/**
	 * The width of the rectangle.
	 *
	 * @name Rectangle#width
	 * @type Number
	 */

	/**
	 * The height of the rectangle.
	 *
	 * @name Rectangle#height
	 * @type Number
	 */

	/**
	 * @ignore
	 */
	set: function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		return this;
	},

	/**
	 * Returns a copy of the rectangle.
	 */
	clone: function() {
		return new Rectangle(this.x, this.y, this.width, this.height);
	},

	/**
	 * Checks whether the coordinates and size of the rectangle are equal to
	 * that of the supplied rectangle.
	 *
	 * @param {Rectangle} rect
	 * @return {Boolean} {@true if the rectangles are equal}
	 */
	equals: function(rect) {
		var rt = Base.isPlainValue(rect)
				? Rectangle.read(arguments)
				: rect;
		return rt === this
				|| rt && this.x === rt.x && this.y === rt.y
					&& this.width === rt.width && this.height === rt.height
				|| false;
	},

	/**
	 * @return {String} a string representation of this rectangle
	 */
	toString: function() {
		var f = Formatter.instance;
		return '{ x: ' + f.number(this.x)
				+ ', y: ' + f.number(this.y)
				+ ', width: ' + f.number(this.width)
				+ ', height: ' + f.number(this.height)
				+ ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		// See Point#_serialize()
		return [f.number(this.x),
				f.number(this.y),
				f.number(this.width),
				f.number(this.height)];
	},

	/**
	 * The top-left point of the rectangle
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function(_dontLink) {
		var ctor = _dontLink ? Point : LinkedPoint;
		return new ctor(this.x, this.y, this, 'setPoint');
	},

	setPoint: function(/* point */) {
		var point = Point.read(arguments);
		this.x = point.x;
		this.y = point.y;
	},


	/**
	 * The size of the rectangle
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function(_dontLink) {
		var ctor = _dontLink ? Size : LinkedSize;
		return new ctor(this.width, this.height, this, 'setSize');
	},

	setSize: function(/* size */) {
		var size = Size.read(arguments);
		// Keep track of how dimensions were specified through this._fix*
		// attributes.
		// _fixX / Y can either be 0 (l), 0.5 (center) or 1 (r), and is used as
		// direct factors to calculate the x / y adujstments from the size
		// differences.
		// _fixW / H is either 0 (off) or 1 (on), and is used to protect
		// widht / height values against changes.
		if (this._fixX)
			this.x += (this.width - size.width) * this._fixX;
		if (this._fixY)
			this.y += (this.height - size.height) * this._fixY;
		this.width = size.width;
		this.height = size.height;
		this._fixW = 1;
		this._fixH = 1;
	},

	/**
	 * {@grouptitle Side Positions}
	 *
	 * The position of the left hand side of the rectangle. Note that this
	 * doesn't move the whole rectangle; the right hand side stays where it was.
	 *
	 * @type Number
	 * @bean
	 */
	getLeft: function() {
		return this.x;
	},

	setLeft: function(left) {
		if (!this._fixW)
			this.width -= left - this.x;
		this.x = left;
		this._fixX = 0;
	},

	/**
	 * The top coordinate of the rectangle. Note that this doesn't move the
	 * whole rectangle: the bottom won't move.
	 *
	 * @type Number
	 * @bean
	 */
	getTop: function() {
		return this.y;
	},

	setTop: function(top) {
		if (!this._fixH)
			this.height -= top - this.y;
		this.y = top;
		this._fixY = 0;
	},

	/**
	 * The position of the right hand side of the rectangle. Note that this
	 * doesn't move the whole rectangle; the left hand side stays where it was.
	 *
	 * @type Number
	 * @bean
	 */
	getRight: function() {
		return this.x + this.width;
	},

	setRight: function(right) {
		// Turn _fixW off if we specify two _fixX values
		if (this._fixX !== undefined && this._fixX !== 1)
			this._fixW = 0;
		if (this._fixW)
			this.x = right - this.width;
		else
			this.width = right - this.x;
		this._fixX = 1;
	},

	/**
	 * The bottom coordinate of the rectangle. Note that this doesn't move the
	 * whole rectangle: the top won't move.
	 *
	 * @type Number
	 * @bean
	 */
	getBottom: function() {
		return this.y + this.height;
	},

	setBottom: function(bottom) {
		// Turn _fixH off if we specify two _fixY values
		if (this._fixY !== undefined && this._fixY !== 1)
			this._fixH = 0;
		if (this._fixH)
			this.y = bottom - this.height;
		else
			this.height = bottom - this.y;
		this._fixY = 1;
	},

	/**
	 * The center-x coordinate of the rectangle.
	 *
	 * @type Number
	 * @bean
	 * @ignore
	 */
	getCenterX: function() {
		return this.x + this.width * 0.5;
	},

	setCenterX: function(x) {
		this.x = x - this.width * 0.5;
		this._fixX = 0.5;
	},

	/**
	 * The center-y coordinate of the rectangle.
	 *
	 * @type Number
	 * @bean
	 * @ignore
	 */
	getCenterY: function() {
		return this.y + this.height * 0.5;
	},

	setCenterY: function(y) {
		this.y = y - this.height * 0.5;
		this._fixY = 0.5;
	},

	/**
	 * {@grouptitle Corner and Center Point Positions}
	 *
	 * The center point of the rectangle.
	 *
	 * @type Point
	 * @bean
	 */
	getCenter: function(_dontLink) {
		var ctor = _dontLink ? Point : LinkedPoint;
		return new ctor(this.getCenterX(), this.getCenterY(), this, 'setCenter');
	},

	setCenter: function(/* point */) {
		var point = Point.read(arguments);
		this.setCenterX(point.x);
		this.setCenterY(point.y);
		// A special setter where we allow chaining, because it comes in handy
		// in a couple of places in core.
		return this;
	},

	/**
	 * The top-left point of the rectangle.
	 *
	 * @name Rectangle#topLeft
	 * @type Point
	 */

	/**
	 * The top-right point of the rectangle.
	 *
	 * @name Rectangle#topRight
	 * @type Point
	 */

	/**
	 * The bottom-left point of the rectangle.
	 *
	 * @name Rectangle#bottomLeft
	 * @type Point
	 */

	/**
	 * The bottom-right point of the rectangle.
	 *
	 * @name Rectangle#bottomRight
	 * @type Point
	 */

	/**
	 * The left-center point of the rectangle.
	 *
	 * @name Rectangle#leftCenter
	 * @type Point
	 */

	/**
	 * The top-center point of the rectangle.
	 *
	 * @name Rectangle#topCenter
	 * @type Point
	 */

	/**
	 * The right-center point of the rectangle.
	 *
	 * @name Rectangle#rightCenter
	 * @type Point
	 */

	/**
	 * The bottom-center point of the rectangle.
	 *
	 * @name Rectangle#bottomCenter
	 * @type Point
	 */

	/**
	 * The area of the rectangle.
	 *
	 * @type Number
	 * @bean
	 */
	getArea: function() {
		return this.width * this.height;
	},

	/**
	 * @return {Boolean} {@true if the rectangle is empty}
	 */
	isEmpty: function() {
		return this.width === 0 || this.height === 0;
	},

	/**
	 * {@grouptitle Geometric Tests}
	 *
	 * Tests if the specified point is inside the boundary of the rectangle.
	 *
	 * @name Rectangle#contains
	 * @function
	 * @param {Point} point the specified point
	 * @return {Boolean} {@true if the point is inside the rectangle's boundary}
	 *
	 * @example {@paperscript}
	 * // Checking whether the mouse position falls within the bounding
	 * // rectangle of an item:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'red';
	 *
	 * function onMouseMove(event) {
	 *	   // Check whether the mouse position intersects with the
	 *	   // bounding box of the item:
	 *	   if (circle.bounds.contains(event.point)) {
	 *		   // If it intersects, fill it with green:
	 *		   circle.fillColor = 'green';
	 *	   } else {
	 *		   // If it doesn't intersect, fill it with red:
	 *		   circle.fillColor = 'red';
	 *	   }
	 * }
	 */
	/**
	 * Tests if the interior of the rectangle entirely contains the specified
	 * rectangle.
	 *
	 * @name Rectangle#contains
	 * @function
	 * @param {Rectangle} rect The specified rectangle
	 * @return {Boolean} {@true if the rectangle entirely contains the specified
	 * rectangle}
	 *
	 * @example {@paperscript}
	 * // Checking whether the bounding box of one item is contained within
	 * // that of another item:
	 *
	 * // All newly created paths will inherit these styles:
	 * project.currentStyle = {
	 *	   fillColor: 'green',
	 *	   strokeColor: 'black'
	 * };
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 45.
	 * var largeCircle = new Path.Circle(new Point(80, 50), 45);
	 *
	 * // Create a smaller circle shaped path in the same position
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * function onMouseMove(event) {
	 *	   // Move the circle to the position of the mouse:
	 *	   circle.position = event.point;
	 *
	 *	   // Check whether the bounding box of the smaller circle
	 *	   // is contained within the bounding box of the larger item:
	 *	   if (largeCircle.bounds.contains(circle.bounds)) {
	 *		   // If it does, fill it with green:
	 *		   circle.fillColor = 'green';
	 *		   largeCircle.fillColor = 'green';
	 *	   } else {
	 *		   // If doesn't, fill it with red:
	 *		   circle.fillColor = 'red';
	 *		   largeCircle.fillColor = 'red';
	 *	   }
	 * }
	 */
	contains: function(arg) {
		// Detect rectangles either by checking for 'width' on the passed object
		// or by looking at the amount of elements in the arguments list,
		// or the passed array:
		return arg && arg.width !== undefined
				|| (Array.isArray(arg) ? arg : arguments).length == 4
				? this._containsRectangle(Rectangle.read(arguments))
				: this._containsPoint(Point.read(arguments));
	},

	_containsPoint: function(point) {
		var x = point.x,
			y = point.y;
		return x >= this.x && y >= this.y
				&& x <= this.x + this.width
				&& y <= this.y + this.height;
	},

	_containsRectangle: function(rect) {
		var x = rect.x,
			y = rect.y;
		return x >= this.x && y >= this.y
				&& x + rect.width <= this.x + this.width
				&& y + rect.height <= this.y + this.height;
	},

	/**
	 * Tests if the interior of this rectangle intersects the interior of
	 * another rectangle. Rectangles just touching each other are considered
	 * as non-intersecting.
	 *
	 * @param {Rectangle} rect the specified rectangle
	 * @return {Boolean} {@true if the rectangle and the specified rectangle
	 * intersect each other}
	 *
	 * @example {@paperscript}
	 * // Checking whether the bounding box of one item intersects with
	 * // that of another item:
	 *
	 * // All newly created paths will inherit these styles:
	 * project.currentStyle = {
	 *	   fillColor: 'green',
	 *	   strokeColor: 'black'
	 * };
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 45.
	 * var largeCircle = new Path.Circle(new Point(80, 50), 45);
	 *
	 * // Create a smaller circle shaped path in the same position
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * function onMouseMove(event) {
	 *	   // Move the circle to the position of the mouse:
	 *	   circle.position = event.point;
	 *
	 *	   // Check whether the bounding box of the two circle
	 *	   // shaped paths intersect:
	 *	   if (largeCircle.bounds.intersects(circle.bounds)) {
	 *		   // If it does, fill it with green:
	 *		   circle.fillColor = 'green';
	 *		   largeCircle.fillColor = 'green';
	 *	   } else {
	 *		   // If doesn't, fill it with red:
	 *		   circle.fillColor = 'red';
	 *		   largeCircle.fillColor = 'red';
	 *	   }
	 * }
	 */
	intersects: function(/* rect */) {
		var rect = Rectangle.read(arguments);
		return rect.x + rect.width > this.x
				&& rect.y + rect.height > this.y
				&& rect.x < this.x + this.width
				&& rect.y < this.y + this.height;
	},

	touches: function(/* rect */) {
		var rect = Rectangle.read(arguments);
		return rect.x + rect.width >= this.x
				&& rect.y + rect.height >= this.y
				&& rect.x <= this.x + this.width
				&& rect.y <= this.y + this.height;
	},

	/**
	 * {@grouptitle Boolean Operations}
	 *
	 * Returns a new rectangle representing the intersection of this rectangle
	 * with the specified rectangle.
	 *
	 * @param {Rectangle} rect The rectangle to be intersected with this
	 * rectangle
	 * @return {Rectangle} the largest rectangle contained in both the specified
	 * rectangle and in this rectangle
	 *
	 * @example {@paperscript}
	 * // Intersecting two rectangles and visualizing the result using rectangle
	 * // shaped paths:
	 *
	 * // Create two rectangles that overlap each other
	 * var size = new Size(50, 50);
	 * var rectangle1 = new Rectangle(new Point(25, 15), size);
	 * var rectangle2 = new Rectangle(new Point(50, 40), size);
	 *
	 * // The rectangle that represents the intersection of the
	 * // two rectangles:
	 * var intersected = rectangle1.intersect(rectangle2);
	 *
	 * // To visualize the intersecting of the rectangles, we will
	 * // create rectangle shaped paths using the Path.Rectangle
	 * // constructor.
	 *
	 * // Have all newly created paths inherit a black stroke:
	 * project.currentStyle.strokeColor = 'black';
	 *
	 * // Create two rectangle shaped paths using the abstract rectangles
	 * // we created before:
	 * new Path.Rectangle(rectangle1);
	 * new Path.Rectangle(rectangle2);
	 *
	 * // Create a path that represents the intersected rectangle,
	 * // and fill it with red:
	 * var intersectionPath = new Path.Rectangle(intersected);
	 * intersectionPath.fillColor = 'red';
	 */
	intersect: function(/* rect */) {
		var rect = Rectangle.read(arguments),
			x1 = Math.max(this.x, rect.x),
			y1 = Math.max(this.y, rect.y),
			x2 = Math.min(this.x + this.width, rect.x + rect.width),
			y2 = Math.min(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Returns a new rectangle representing the union of this rectangle with the
	 * specified rectangle.
	 *
	 * @param {Rectangle} rect the rectangle to be combined with this rectangle
	 * @return {Rectangle} the smallest rectangle containing both the specified
	 * rectangle and this rectangle
	 */
	unite: function(/* rect */) {
		var rect = Rectangle.read(arguments),
			x1 = Math.min(this.x, rect.x),
			y1 = Math.min(this.y, rect.y),
			x2 = Math.max(this.x + this.width, rect.x + rect.width),
			y2 = Math.max(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Adds a point to this rectangle. The resulting rectangle is the
	 * smallest rectangle that contains both the original rectangle and the
	 * specified point.
	 *
	 * After adding a point, a call to {@link #contains(point)} with the added
	 * point as an argument does not necessarily return {@code true}.
	 * The {@link Rectangle#contains(point)} method does not return {@code true}
	 * for points on the right or bottom edges of a rectangle. Therefore, if the
	 * added point falls on the left or bottom edge of the enlarged rectangle,
	 * {@link Rectangle#contains(point)} returns {@code false} for that point.
	 *
	 * @param {Point} point
	 */
	include: function(/* point */) {
		var point = Point.read(arguments);
		var x1 = Math.min(this.x, point.x),
			y1 = Math.min(this.y, point.y),
			x2 = Math.max(this.x + this.width, point.x),
			y2 = Math.max(this.y + this.height, point.y);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Expands the rectangle by the specified amount in horizontal and
	 * vertical directions.
	 *
	 * @name Rectangle#expand
	 * @function
	 * @param {Number|Size|Point} amount the amount to expand the rectangle in
	 * both directions
	 */
	/**
	 * Expands the rectangle by the specified amounts in horizontal and
	 * vertical directions.
	 *
	 * @name Rectangle#expand
	 * @function
	 * @param {Number} hor the amount to expand the rectangle in horizontal
	 * direction
	 * @param {Number} ver the amount to expand the rectangle in horizontal
	 * direction
	 */
	expand: function(/* amount */) {
		var amount = Size.read(arguments),
			hor = amount.width,
			ver = amount.height;
		return new Rectangle(this.x - hor / 2, this.y - ver / 2,
				this.width + hor, this.height + ver);
	},

	/**
	 * Scales the rectangle by the specified amount from its center.
	 *
	 * @name Rectangle#scale
	 * @function
	 * @param {Number} amount
	 */
	/**
	 * Scales the rectangle in horizontal direction by the specified
	 * {@code hor} amount and in vertical direction by the specified {@code ver}
	 * amount from its center.
	 *
	 * @name Rectangle#scale
	 * @function
	 * @param {Number} hor
	 * @param {Number} ver
	 */
	scale: function(hor, ver) {
		return this.expand(this.width * hor - this.width,
				this.height * (ver === undefined ? hor : ver) - this.height);
	}
}, Base.each([
		['Top', 'Left'], ['Top', 'Right'],
		['Bottom', 'Left'], ['Bottom', 'Right'],
		['Left', 'Center'], ['Top', 'Center'],
		['Right', 'Center'], ['Bottom', 'Center']
	],
	function(parts, index) {
		var part = parts.join('');
		// find out if the first of the pair is an x or y property,
		// by checking the first character for [R]ight or [L]eft;
		var xFirst = /^[RL]/.test(part);
		// Rename Center to CenterX or CenterY:
		if (index >= 4)
			parts[1] += xFirst ? 'Y' : 'X';
		var x = parts[xFirst ? 0 : 1],
			y = parts[xFirst ? 1 : 0],
			getX = 'get' + x,
			getY = 'get' + y,
			setX = 'set' + x,
			setY = 'set' + y,
			get = 'get' + part,
			set = 'set' + part;
		this[get] = function(_dontLink) {
			var ctor = _dontLink ? Point : LinkedPoint;
			return new ctor(this[getX](), this[getY](), this, set);
		};
		this[set] = function(/* point */) {
			var point = Point.read(arguments);
			this[setX](point.x);
			this[setY](point.y);
		};
	}, {
		// Enforce creation of beans, as bean getters have hidden parameters
		// See _dontLink argument above.
		beans: true
	}
));

/**
 * @name LinkedRectangle
 *
 * @class An internal version of Rectangle that notifies its owner of each
 * change through setting itself again on the setter that corresponds to the
 * getter that produced this LinkedRectangle.
 * Note: This prototype is not exported.
 *
 * @private
 */
var LinkedRectangle = Rectangle.extend({
	// Have LinkedRectangle appear as a normal Rectangle in debugging
	initialize: function Rectangle(x, y, width, height, owner, setter) {
		this.set(x, y, width, height, true);
		this._owner = owner;
		this._setter = setter;
	},

	set: function(x, y, width, height, _dontNotify) {
		this._x = x;
		this._y = y;
		this._width = width;
		this._height = height;
		if (!_dontNotify)
			this._owner[this._setter](this);
		return this;
	}
},
new function() {
	var proto = Rectangle.prototype;

	return Base.each(['x', 'y', 'width', 'height'], function(key) {
		var part = Base.capitalize(key);
		var internal = '_' + key;
		this['get' + part] = function() {
			return this[internal];
		};

		this['set' + part] = function(value) {
			this[internal] = value;
			// Check if this setter is called from another one which sets
			// _dontNotify, as it will notify itself
			if (!this._dontNotify)
				this._owner[this._setter](this);
		};
	}, Base.each(['Point', 'Size', 'Center',
			'Left', 'Top', 'Right', 'Bottom', 'CenterX', 'CenterY',
			'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
			'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'],
		function(key) {
			var name = 'set' + key;
			this[name] = function(/* value */) {
				// Make sure the above setters of x, y, width, height do not
				// each notify the owner, as we're going to take care of this
				// afterwards here, only once per change.
				this._dontNotify = true;
				proto[name].apply(this, arguments);
				this._dontNotify = false;
				this._owner[this._setter](this);
			};
		}, /** @lends Rectangle# */{
			/**
			 * {@grouptitle Item Bounds}
			 *
			 * Specifies whether an item's bounds are selected and will also
			 * mark the item as selected.
			 *
			 * Paper.js draws the visual bounds of selected items on top of your
			 * project. This can be useful for debugging.
			 *
			 * @type Boolean
			 * @default false
			 * @bean
			 */
			isSelected: function() {
				return this._owner._boundsSelected;
			},

			setSelected: function(selected) {
				var owner = this._owner;
				if (owner.setSelected) {
					owner._boundsSelected = selected;
					// Update the owner's selected state too, so the bounds
					// actually get drawn. When deselecting, take a path's
					// _selectedSegmentState into account too, since it will
					// have to remain selected even when bounds are deselected
					owner.setSelected(selected || owner._selectedSegmentState > 0);
				}
			}
		})
	);
});

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

// Based on goog.graphics.AffineTransform, as part of the Closure Library.
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

/**
 * @name Matrix
 *
 * @class An affine transform performs a linear mapping from 2D coordinates
 * to other 2D coordinates that preserves the "straightness" and
 * "parallelness" of lines.
 *
 * Such a coordinate transformation can be represented by a 3 row by 3
 * column matrix with an implied last row of [ 0 0 1 ]. This matrix
 * transforms source coordinates (x,y) into destination coordinates (x',y')
 * by considering them to be a column vector and multiplying the coordinate
 * vector by the matrix according to the following process:
 * <pre>
 *		[ x ]	[ a	 b	tx ] [ x ]	 [ a * x + b * y + tx ]
 *		[ y ] = [ c	 d	ty ] [ y ] = [ c * x + d * y + ty ]
 *		[ 1 ]	[ 0	 0	1  ] [ 1 ]	 [		   1		  ]
 * </pre>
 *
 * This class is optimized for speed and minimizes calculations based on its
 * knowledge of the underlying matrix (as opposed to say simply performing
 * matrix multiplication).
 */
var Matrix = Base.extend(/** @lends Matrix# */{
	_class: 'Matrix',

	/**
	 * Creates a 2D affine transform.
	 *
	 * @param {Number} a the a property of the transform
	 * @param {Number} c the c property of the transform
	 * @param {Number} b the b property of the transform
	 * @param {Number} d the d property of the transform
	 * @param {Number} tx the tx property of the transform
	 * @param {Number} ty the ty property of the transform
	 */
	initialize: function Matrix(arg) {
		var count = arguments.length,
			ok = true;
		if (count === 6) {
			this.set.apply(this, arguments);
		} else if (count === 1) {
			if (arg instanceof Matrix) {
				this.set(arg._a, arg._c, arg._b, arg._d, arg._tx, arg._ty);
			} else if (Array.isArray(arg)) {
				this.set.apply(this, arg);
			} else {
				ok = false;
			}
		} else if (count === 0) {
			this.reset();
		} else {
			ok = false;
		}
		if (!ok)
			throw new Error('Unsupported matrix parameters');
	},

	/**
	 * Sets this transform to the matrix specified by the 6 values.
	 *
	 * @param {Number} a the a property of the transform
	 * @param {Number} c the c property of the transform
	 * @param {Number} b the b property of the transform
	 * @param {Number} d the d property of the transform
	 * @param {Number} tx the tx property of the transform
	 * @param {Number} ty the ty property of the transform
	 * @return {Matrix} this affine transform
	 */
	set: function(a, c, b, d, tx, ty, _dontNotify) {
		this._a = a;
		this._c = c;
		this._b = b;
		this._d = d;
		this._tx = tx;
		this._ty = ty;
		if (!_dontNotify)
			this._changed();
		return this;
	},

	_serialize: function(options) {
		return Base.serialize(this.getValues(), options);
	},

	_changed: function() {
		var owner = this._owner;
		if (owner) {
			// If owner has #applyMatrix set, directly bake the change in now.
			if (owner._applyMatrix) {
				owner.transform(null, true);
			} else {
				owner._changed(9);
			}
		}
	},

	/**
	 * @return {Matrix} a copy of this transform
	 */
	clone: function() {
		return new Matrix(this._a, this._c, this._b, this._d,
				this._tx, this._ty);
	},

	/**
	 * Checks whether the two matrices describe the same transformation.
	 *
	 * @param {Matrix} matrix the matrix to compare this matrix to
	 * @return {Boolean} {@true if the matrices are equal}
	 */
	equals: function(mx) {
		return mx === this || mx && this._a === mx._a && this._b === mx._b
				&& this._c === mx._c && this._d === mx._d
				&& this._tx === mx._tx && this._ty === mx._ty
				|| false;
	},

	/**
	 * @return {String} a string representation of this transform
	 */
	toString: function() {
		var f = Formatter.instance;
		return '[[' + [f.number(this._a), f.number(this._b),
					f.number(this._tx)].join(', ') + '], ['
				+ [f.number(this._c), f.number(this._d),
					f.number(this._ty)].join(', ') + ']]';
	},

	/**
	 * Resets the matrix by setting its values to the ones of the identity
	 * matrix that results in no transformation.
	 */
	reset: function(_dontNotify) {
		this._a = this._d = 1;
		this._c = this._b = this._tx = this._ty = 0;
		if (!_dontNotify)
			this._changed();
		return this;
	},

	/**
	 * Attempts to apply the matrix to the content of item that it belongs to,
	 * meaning its transformation is baked into the item's content or children.
	 *
	 * @param {Boolean} recursively controls whether to apply transformations
	 * recursively on children
	 * @return {Boolean} {@true if the matrix was applied}
	 */
	apply: function(recursively, _setApplyMatrix) {
		var owner = this._owner;
		if (owner) {
			owner.transform(null, true, Base.pick(recursively, true),
					_setApplyMatrix);
			// If the matrix was successfully applied, it will be reset now.
			return this.isIdentity();
		}
		return false;
	},

	/**
	 * Concatenates this transform with a translate transformation.
	 *
	 * @name Matrix#translate
	 * @function
	 * @param {Point} point the vector to translate by
	 * @return {Matrix} this affine transform
	 */
	/**
	 * Concatenates this transform with a translate transformation.
	 *
	 * @name Matrix#translate
	 * @function
	 * @param {Number} dx the distance to translate in the x direction
	 * @param {Number} dy the distance to translate in the y direction
	 * @return {Matrix} this affine transform
	 */
	translate: function(/* point */) {
		var point = Point.read(arguments),
			x = point.x,
			y = point.y;
		this._tx += x * this._a + y * this._b;
		this._ty += x * this._c + y * this._d;
		this._changed();
		return this;
	},

	/**
	 * Concatenates this transform with a scaling transformation.
	 *
	 * @name Matrix#scale
	 * @function
	 * @param {Number} scale the scaling factor
	 * @param {Point} [center] the center for the scaling transformation
	 * @return {Matrix} this affine transform
	 */
	/**
	 * Concatenates this transform with a scaling transformation.
	 *
	 * @name Matrix#scale
	 * @function
	 * @param {Number} hor the horizontal scaling factor
	 * @param {Number} ver the vertical scaling factor
	 * @param {Point} [center] the center for the scaling transformation
	 * @return {Matrix} this affine transform
	 */
	scale: function(/* scale, center */) {
		// Do not modify scale, center, since that would arguments of which
		// we're reading from!
		var scale = Point.read(arguments),
			center = Point.read(arguments, 0, { readNull: true });
		if (center)
			this.translate(center);
		this._a *= scale.x;
		this._c *= scale.x;
		this._b *= scale.y;
		this._d *= scale.y;
		if (center)
			this.translate(center.negate());
		this._changed();
		return this;
	},

	/**
	 * Concatenates this transform with a rotation transformation around an
	 * anchor point.
	 *
	 * @name Matrix#rotate
	 * @function
	 * @param {Number} angle the angle of rotation measured in degrees
	 * @param {Point} center the anchor point to rotate around
	 * @return {Matrix} this affine transform
	 */
	/**
	 * Concatenates this transform with a rotation transformation around an
	 * anchor point.
	 *
	 * @name Matrix#rotate
	 * @function
	 * @param {Number} angle the angle of rotation measured in degrees
	 * @param {Number} x the x coordinate of the anchor point
	 * @param {Number} y the y coordinate of the anchor point
	 * @return {Matrix} this affine transform
	 */
	rotate: function(angle /*, center */) {
		angle *= Math.PI / 180;
		var center = Point.read(arguments, 1),
			// Concatenate rotation matrix into this one
			x = center.x,
			y = center.y,
			cos = Math.cos(angle),
			sin = Math.sin(angle),
			tx = x - x * cos + y * sin,
			ty = y - x * sin - y * cos,
			a = this._a,
			b = this._b,
			c = this._c,
			d = this._d;
		this._a = cos * a + sin * b;
		this._b = -sin * a + cos * b;
		this._c = cos * c + sin * d;
		this._d = -sin * c + cos * d;
		this._tx += tx * a + ty * b;
		this._ty += tx * c + ty * d;
		this._changed();
		return this;
	},

	/**
	 * Concatenates this transform with a shear transformation.
	 *
	 * @name Matrix#shear
	 * @function
	 * @param {Point} shear the shear factor in x and y direction
	 * @param {Point} [center] the center for the shear transformation
	 * @return {Matrix} this affine transform
	 */
	/**
	 * Concatenates this transform with a shear transformation.
	 *
	 * @name Matrix#shear
	 * @function
	 * @param {Number} hor the horizontal shear factor
	 * @param {Number} ver the vertical shear factor
	 * @param {Point} [center] the center for the shear transformation
	 * @return {Matrix} this affine transform
	 */
	shear: function(/* shear, center */) {
		// Do not modify point, center, since that would arguments of which
		// we're reading from!
		var shear = Point.read(arguments),
			center = Point.read(arguments, 0, { readNull: true });
		if (center)
			this.translate(center);
		var a = this._a,
			c = this._c;
		this._a += shear.y * this._b;
		this._c += shear.y * this._d;
		this._b += shear.x * a;
		this._d += shear.x * c;
		if (center)
			this.translate(center.negate());
		this._changed();
		return this;
	},

	/**
	 * Concatenates this transform with a skew transformation.
	 *
	 * @name Matrix#skew
	 * @function
	 * @param {Point} skew the skew angles in x and y direction in degrees
	 * @param {Point} [center] the center for the skew transformation
	 * @return {Matrix} this affine transform
	 */
	/**
	 * Concatenates this transform with a skew transformation.
	 *
	 * @name Matrix#skew
	 * @function
	 * @param {Number} hor the horizontal skew angle in degrees
	 * @param {Number} ver the vertical skew angle in degrees
	 * @param {Point} [center] the center for the skew transformation
	 * @return {Matrix} this affine transform
	 */
	skew: function(/* skew, center */) {
		var skew = Point.read(arguments),
			center = Point.read(arguments, 0, { readNull: true }),
			toRadians = Math.PI / 180,
			shear = new Point(Math.tan(skew.x * toRadians),
				Math.tan(skew.y * toRadians));
		return this.shear(shear, center);
	},

	/**
	 * Concatenates the given affine transform to this transform.
	 *
	 * @param {Matrix} mx the transform to concatenate
	 * @return {Matrix} this affine transform
	 */
	concatenate: function(mx) {
		var a1 = this._a,
			b1 = this._b,
			c1 = this._c,
			d1 = this._d,
			a2 = mx._a,
			b2 = mx._b,
			c2 = mx._c,
			d2 = mx._d,
			tx2 = mx._tx,
			ty2 = mx._ty;
		this._a = a2 * a1 + c2 * b1;
		this._b = b2 * a1 + d2 * b1;
		this._c = a2 * c1 + c2 * d1;
		this._d = b2 * c1 + d2 * d1;
		this._tx += tx2 * a1 + ty2 * b1;
		this._ty += tx2 * c1 + ty2 * d1;
		this._changed();
		return this;
	},

	/**
	 * Pre-concatenates the given affine transform to this transform.
	 *
	 * @param {Matrix} mx the transform to preconcatenate
	 * @return {Matrix} this affine transform
	 */
	preConcatenate: function(mx) {
		var a1 = this._a,
			b1 = this._b,
			c1 = this._c,
			d1 = this._d,
			tx1 = this._tx,
			ty1 = this._ty,
			a2 = mx._a,
			b2 = mx._b,
			c2 = mx._c,
			d2 = mx._d,
			tx2 = mx._tx,
			ty2 = mx._ty;
		this._a = a2 * a1 + b2 * c1;
		this._b = a2 * b1 + b2 * d1;
		this._c = c2 * a1 + d2 * c1;
		this._d = c2 * b1 + d2 * d1;
		this._tx = a2 * tx1 + b2 * ty1 + tx2;
		this._ty = c2 * tx1 + d2 * ty1 + ty2;
		this._changed();
		return this;
	},

	/**
	 * Returns a new instance of the result of the concatenation of the given
	 * affine transform with this transform.
	 *
	 * @param {Matrix} mx the transform to concatenate
	 * @return {Matrix} the newly created affine transform
	 */
	chain: function(mx) {
		var a1 = this._a,
			b1 = this._b,
			c1 = this._c,
			d1 = this._d,
			tx1 = this._tx,
			ty1 = this._ty,
			a2 = mx._a,
			b2 = mx._b,
			c2 = mx._c,
			d2 = mx._d,
			tx2 = mx._tx,
			ty2 = mx._ty;
		return new Matrix(
				a2 * a1 + c2 * b1,
				a2 * c1 + c2 * d1,
				b2 * a1 + d2 * b1,
				b2 * c1 + d2 * d1,
				tx1 + tx2 * a1 + ty2 * b1,
				ty1 + tx2 * c1 + ty2 * d1);
	},

	/**
	 * @return {Boolean} whether this transform is the identity transform
	 */
	isIdentity: function() {
		return this._a === 1 && this._c === 0 && this._b === 0 && this._d === 1
				&& this._tx === 0 && this._ty === 0;
	},

	orNullIfIdentity: function() {
		return this.isIdentity() ? null : this;
	},

	/**
	 * Returns whether the transform is invertible. A transform is not
	 * invertible if the determinant is 0 or any value is non-finite or NaN.
	 *
	 * @return {Boolean} whether the transform is invertible
	 */
	isInvertible: function() {
		return !!this._getDeterminant();
	},

	/**
	 * Checks whether the matrix is singular or not. Singular matrices cannot be
	 * inverted.
	 *
	 * @return {Boolean} whether the matrix is singular
	 */
	isSingular: function() {
		return !this._getDeterminant();
	},

	/**
	 * Transforms a point and returns the result.
	 *
	 * @name Matrix#transform
	 * @function
	 * @param {Point} point the point to be transformed
	 * @return {Point} the transformed point
	 */
	/**
	 * Transforms an array of coordinates by this matrix and stores the results
	 * into the destination array, which is also returned.
	 *
	 * @name Matrix#transform
	 * @function
	 * @param {Number[]} src the array containing the source points
	 * as x, y value pairs
	 * @param {Number[]} dst the array into which to store the transformed
	 * point pairs
	 * @param {Number} count the number of points to transform
	 * @return {Number[]} the dst array, containing the transformed coordinates
	 */
	transform: function(/* point | */ src, dst, count) {
		return arguments.length < 3
			// TODO: Check for rectangle and use _tranformBounds?
			? this._transformPoint(Point.read(arguments))
			: this._transformCoordinates(src, dst, count);
	},

	/**
	 * A faster version of transform that only takes one point and does not
	 * attempt to convert it.
	 */
	_transformPoint: function(point, dest, _dontNotify) {
		var x = point.x,
			y = point.y;
		if (!dest)
			dest = new Point();
		return dest.set(
			x * this._a + y * this._b + this._tx,
			x * this._c + y * this._d + this._ty,
			_dontNotify
		);
	},

	_transformCoordinates: function(src, dst, count) {
		var i = 0,
			j = 0,
			max = 2 * count;
		while (i < max) {
			var x = src[i++],
				y = src[i++];
			dst[j++] = x * this._a + y * this._b + this._tx;
			dst[j++] = x * this._c + y * this._d + this._ty;
		}
		return dst;
	},

	_transformCorners: function(rect) {
		var x1 = rect.x,
			y1 = rect.y,
			x2 = x1 + rect.width,
			y2 = y1 + rect.height,
			coords = [ x1, y1, x2, y1, x2, y2, x1, y2 ];
		return this._transformCoordinates(coords, coords, 4);
	},

	/**
	 * Returns the 'transformed' bounds rectangle by transforming each corner
	 * point and finding the new bounding box to these points. This is not
	 * really the transformed rectangle!
	 */
	_transformBounds: function(bounds, dest, _dontNotify) {
		var coords = this._transformCorners(bounds),
			min = coords.slice(0, 2),
			max = min.slice();
		for (var i = 2; i < 8; i++) {
			var val = coords[i],
				j = i & 1;
			if (val < min[j])
				min[j] = val;
			else if (val > max[j])
				max[j] = val;
		}
		if (!dest)
			dest = new Rectangle();
		return dest.set(min[0], min[1], max[0] - min[0], max[1] - min[1],
				_dontNotify);
	},

	/**
	 * Inverse transforms a point and returns the result.
	 *
	 * @param {Point} point the point to be transformed
	 */
	inverseTransform: function(/* point */) {
		return this._inverseTransform(Point.read(arguments));
	},

	/**
	 * Returns the determinant of this transform, but only if the matrix is
	 * reversible, null otherwise.
	 */
	_getDeterminant: function() {
		var det = this._a * this._d - this._b * this._c;
		return isFinite(det) && !Numerical.isZero(det)
				&& isFinite(this._tx) && isFinite(this._ty)
				? det : null;
	},

	_inverseTransform: function(point, dest, _dontNotify) {
		var det = this._getDeterminant();
		if (!det)
			return null;
		var x = point.x - this._tx,
			y = point.y - this._ty;
		if (!dest)
			dest = new Point();
		return dest.set(
			(x * this._d - y * this._b) / det,
			(y * this._a - x * this._c) / det,
			_dontNotify
		);
	},

	/**
	 * Attempts to decompose the affine transformation described by this matrix
	 * into {@code scaling}, {@code rotation} and {@code shearing}, and returns
	 * an object with these properties if it succeeded, {@code null} otherwise.
	 *
	 * @return {Object} the decomposed matrix, or {@code null} if decomposition
	 * is not possible
	 */
	decompose: function() {
		// http://dev.w3.org/csswg/css3-2d-transforms/#matrix-decomposition
		// http://stackoverflow.com/questions/4361242/
		// https://github.com/wisec/DOMinator/blob/master/layout/style/nsStyleAnimation.cpp#L946
		var a = this._a, b = this._b, c = this._c, d = this._d;
		if (Numerical.isZero(a * d - b * c))
			return null;

		var scaleX = Math.sqrt(a * a + b * b);
		a /= scaleX;
		b /= scaleX;

		var shear = a * c + b * d;
		c -= a * shear;
		d -= b * shear;

		var scaleY = Math.sqrt(c * c + d * d);
		c /= scaleY;
		d /= scaleY;
		shear /= scaleY;

		// a * d - b * c should now be 1 or -1
		if (a * d < b * c) {
			a = -a;
			b = -b;
			// We don't need c & d anymore, but if we did, we'd have to do this:
			// c = -c;
			// d = -d;
			shear = -shear;
			scaleX = -scaleX;
		}

		return {
			scaling: new Point(scaleX, scaleY),
			rotation: -Math.atan2(b, a) * 180 / Math.PI,
			shearing: shear
		};
	},

	/**
	 * The value that affects the transformation along the x axis when scaling
	 * or rotating, positioned at (0, 0) in the transformation matrix.
	 *
	 * @name Matrix#a
	 * @type Number
	 */

	/**
	 * The value that affects the transformation along the y axis when rotating
	 * or skewing, positioned at (1, 0) in the transformation matrix.
	 *
	 * @name Matrix#c
	 * @type Number
	 */

	/**
	 * The value that affects the transformation along the x axis when rotating
	 * or skewing, positioned at (0, 1) in the transformation matrix.
	 *
	 * @name Matrix#b
	 * @type Number
	 */

	/**
	 * The value that affects the transformation along the y axis when scaling
	 * or rotating, positioned at (1, 1) in the transformation matrix.
	 *
	 * @name Matrix#d
	 * @type Number
	 */

	/**
	 * The distance by which to translate along the x axis, positioned at (2, 0)
	 * in the transformation matrix.
	 *
	 * @name Matrix#tx
	 * @type Number
	 */

	/**
	 * The distance by which to translate along the y axis, positioned at (2, 1)
	 * in the transformation matrix.
	 *
	 * @name Matrix#ty
	 * @type Number
	 */

	/**
	 * The transform values as an array, in the same sequence as they are passed
	 * to {@link #initialize(a, c, b, d, tx, ty)}.
	 *
	 * @type Number[]
	 * @bean
	 */
	getValues: function() {
		return [ this._a, this._c, this._b, this._d, this._tx, this._ty ];
	},

	/**
	 * The translation of the matrix as a vector.
	 *
	 * @type Point
	 * @bean
	 */
	getTranslation: function() {
		// No decomposition is required to extract translation.
		return new Point(this._tx, this._ty);
	},

	/**
	 * The scaling values of the matrix, if it can be decomposed.
	 *
	 * @type Point
	 * @bean
	 * @see #decompose()
	 */
	getScaling: function() {
		return (this.decompose() || {}).scaling;
	},

	/**
	 * The rotation angle of the matrix, if it can be decomposed.
	 *
	 * @type Number
	 * @bean
	 * @see #decompose()
	 */
	getRotation: function() {
		return (this.decompose() || {}).rotation;
	},

	/**
	 * Creates the inversion of the transformation of the matrix and returns it
	 * as a new insteance. If the matrix is not invertible (in which case
	 * {@link #isSingular()} returns true), {@code null } is returned.
	 *
	 * @return {Matrix} the inverted matrix, or {@code null }, if the matrix is
	 * singular
	 */
	inverted: function() {
		var det = this._getDeterminant();
		return det && new Matrix(
				this._d / det,
				-this._c / det,
				-this._b / det,
				this._a / det,
				(this._b * this._ty - this._d * this._tx) / det,
				(this._c * this._tx - this._a * this._ty) / det);
	},

	shiftless: function() {
		return new Matrix(this._a, this._c, this._b, this._d, 0, 0);
	},

	/**
	 * Applies this matrix to the specified Canvas Context.
	 *
	 * @param {CanvasRenderingContext2D} ctx
	 */
	applyToContext: function(ctx) {
		ctx.transform(this._a, this._c, this._b, this._d, this._tx, this._ty);
	}
}, Base.each(['a', 'c', 'b', 'd', 'tx', 'ty'], function(name) {
	// Create getters and setters for all internal attributes.
	var part = Base.capitalize(name),
		prop = '_' + name;
	this['get' + part] = function() {
		return this[prop];
	};
	this['set' + part] = function(value) {
		this[prop] = value;
		this._changed();
	};
}, {}));

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
 * @name Line
 *
 * @class The Line object represents..
 */
var Line = Base.extend(/** @lends Line# */{
	_class: 'Line',

	// DOCS: document Line class and constructor
	/**
	 * Creates a Line object.
	 *
	 * @param {Point} point1
	 * @param {Point} point2
	 * @param {Boolean} [asVector=false]
	 */
	initialize: function Line(arg0, arg1, arg2, arg3, arg4) {
		var asVector = false;
		if (arguments.length >= 4) {
			this._px = arg0;
			this._py = arg1;
			this._vx = arg2;
			this._vy = arg3;
			asVector = arg4;
		} else {
			this._px = arg0.x;
			this._py = arg0.y;
			this._vx = arg1.x;
			this._vy = arg1.y;
			asVector = arg2;
		}
		if (!asVector) {
			this._vx -= this._px;
			this._vy -= this._py;
		}
	},

	/**
	 * The starting point of the line.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		return new Point(this._px, this._py);
	},

	/**
	 * The direction of the line as a vector.
	 *
	 * @type Point
	 * @bean
	 */
	getVector: function() {
		return new Point(this._vx, this._vy);
	},

	/**
	 * The length of the line.
	 *
	 * @type Number
	 * @bean
	 */
	getLength: function() {
		return this.getVector().getLength();
	},

	/**
	 * @param {Line} line
	 * @param {Boolean} [isInfinite=false]
	 * @return {Point} the intersection point of the lines, {@code undefined}
	 * if the two lines are collinear, or {@code null} if they don't intersect.
	 */
	intersect: function(line, isInfinite) {
		return Line.intersect(
				this._px, this._py, this._vx, this._vy,
				line._px, line._py, line._vx, line._vy,
				true, isInfinite);
	},

	// DOCS: document Line#getSide(point)
	/**
	 * @param {Point} point
	 * @param {Boolean} [isInfinite=false]
	 * @return {Number}
	 */
	getSide: function(point, isInfinite) {
		return Line.getSide(
				this._px, this._py, this._vx, this._vy,
				point.x, point.y, true, isInfinite);
	},

	// DOCS: document Line#getDistance(point)
	/**
	 * @param {Point} point
	 * @return {Number}
	 */
	getDistance: function(point) {
		return Math.abs(Line.getSignedDistance(
				this._px, this._py, this._vx, this._vy,
				point.x, point.y, true));
	},

	isCollinear: function(line) {
		return Point.isCollinear(this._vx, this._vy, line._vx, line._vy);
	},

	isOrthogonal: function(line) {
		return Point.isOrthogonal(this._vx, this._vy, line._vx, line._vy);
	},

	statics: /** @lends Line */{
		intersect: function(p1x, p1y, v1x, v1y, p2x, p2y, v2x, v2y, asVector,
				isInfinite) {
			// Convert 2nd points to vectors if they are not specified as such.
			if (!asVector) {
				v1x -= p1x;
				v1y -= p1y;
				v2x -= p2x;
				v2y -= p2y;
			}
			var cross = v1x * v2y - v1y * v2x;
			// Avoid divisions by 0, and errors when getting too close to 0
			if (!Numerical.isZero(cross)) {
				var dx = p1x - p2x,
					dy = p1y - p2y,
					u1 = (v2x * dy - v2y * dx) / cross,
					u2 = (v1x * dy - v1y * dx) / cross,
					// Check the ranges of the u parameters if the line is not
					// allowed to extend beyond the definition points, but
					// compare with EPSILON tolerance over the [0, 1] bounds.
					epsilon = 1e-12,
					uMin = -epsilon,
					uMax = 1 + epsilon;
				if (isInfinite
						|| uMin < u1 && u1 < uMax && uMin < u2 && u2 < uMax) {
					if (!isInfinite) {
						// Address the tolerance at the bounds by clipping to
						// the actual range.
						u1 = u1 <= 0 ? 0 : u1 >= 1 ? 1 : u1;
					}
					return new Point(
							p1x + u1 * v1x,
							p1y + u1 * v1y);
				}
			}
		},

		getSide: function(px, py, vx, vy, x, y, asVector, isInfinite) {
			if (!asVector) {
				vx -= px;
				vy -= py;
			}
			var v2x = x - px,
				v2y = y - py,
				// ccw = v2.cross(v1);
				ccw = v2x * vy - v2y * vx;
			if (ccw === 0 && !isInfinite) {
				// If the point is on the infinite line, check if it's on the
				// finite line too: Project v2 onto v1 and determine ccw based
				// on which side of the finite line the point lies. Calculate
				// the 'u' value of the point on the line, and use it for ccw:
				// u = v2.dot(v1) / v1.dot(v1)
				ccw = (v2x * vx + v2x * vx) / (vx * vx + vy * vy);
				// If the 'u' value is within the line range, set ccw to 0,
				// otherwise its already correct sign is all we need.
				if (ccw >= 0 && ccw <= 1)
					ccw = 0;
			}
			return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
		},

		getSignedDistance: function(px, py, vx, vy, x, y, asVector) {
			if (!asVector) {
				vx -= px;
				vy -= py;
			}
			// Based on the error analysis by @iconexperience outlined in
			// https://github.com/paperjs/paper.js/issues/799
			return vx === 0 ? vy > 0 ? x - px : px - x
				 : vy === 0 ? vx < 0 ? y - py : py - y
				 : ((x-px) * vy - (y-py) * vx) / Math.sqrt(vx * vx + vy * vy);
		}
	}
});


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
 * @name Project
 *
 * @class A Project object in Paper.js is what usually is referred to as the
 * document: The top level object that holds all the items contained in the
 * scene graph. As the term document is already taken in the browser context,
 * it is called Project.
 *
 * Projects allow the manipulation of the styles that are applied to all newly
 * created items, give access to the selected items, and will in future versions
 * offer ways to query for items in the scene graph defining specific
 * requirements, and means to persist and load from different formats, such as
 * SVG and PDF.
 *
 * The currently active project can be accessed through the
 * {@link PaperScope#project} variable.
 *
 * An array of all open projects is accessible through the
 * {@link PaperScope#projects} variable.
 */
var Project = PaperScopeItem.extend(/** @lends Project# */{
	_class: 'Project',
	_list: 'projects',
	_reference: 'project',

	// TODO: Add arguments to define pages
	/**
	 * Creates a Paper.js project containing one empty {@link Layer}, referenced
	 * by {@link Project#activeLayer}.
	 *
	 * Note that when working with PaperScript, a project is automatically
	 * created for us and the {@link PaperScope#project} variable points to it.
	 *
	 * @param {HTMLCanvasElement|String} element the HTML canvas element that
	 * should be used as the element for the view, or an ID string by which to
	 * find the element.
	 */
	initialize: function Project(element) {
		// Activate straight away by passing true to PaperScopeItem constructor,
		// so paper.project is set, as required by Layer and DoumentView
		// constructors.
		PaperScopeItem.call(this, true);
		this.layers = [];
		this._activeLayer = null;
		this.symbols = [];
		this._currentStyle = new Style(null, null, this);
		// If no view is provided, we create a 1x1 px canvas view just so we
		// have something to do size calculations with.
		// (e.g. PointText#_getBounds)
		this._view = View.create(this,
				element || CanvasProvider.getCanvas(1, 1));
		this._selectedItems = {};
		this._selectedItemCount = 0;
		// See Item#draw() for an explanation of _updateVersion
		this._updateVersion = 0;
		// Change tracking, not in use for now. Activate once required:
		// this._changes = [];
		// this._changesById = {};
	},

	_serialize: function(options, dictionary) {
		// Just serialize layers to an array for now, they will be unserialized
		// into the active project automatically. We might want to add proper
		// project serialization later, but deserialization of a layers array
		// will always work.
		// Pass true for compact, so 'Project' does not get added as the class
		return Base.serialize(this.layers, options, true, dictionary);
	},

	/**
	 * Activates this project, so all newly created items will be placed
	 * in it.
	 *
	 * @name Project#activate
	 * @function
	 */

	/**
	 * Clears the project by removing all {@link Project#layers} and
	 * {@link Project#symbols}.
	 */
	clear: function() {
		for (var i = this.layers.length - 1; i >= 0; i--)
			this.layers[i].remove();
		this.symbols = [];
	},

	/**
	 * Checks whether the project has any content or not.
	 *
	 * @return Boolean
	 */
	isEmpty: function() {
		return this.layers.length === 0;
	},

	/**
	 * Removes this project from the {@link PaperScope#projects} list, and also
	 * removes its view, if one was defined.
	 */
	remove: function remove() {
		if (!remove.base.call(this))
			return false;
		if (this._view)
			this._view.remove();
		return true;
	},

	/**
	 * The reference to the project's view.
	 * @type View
	 * @bean
	 */
	getView: function() {
		return this._view;
	},

	/**
	 * The currently active path style. All selected items and newly
	 * created items will be styled with this style.
	 *
	 * @type Style
	 * @bean
	 *
	 * @example {@paperscript}
	 * project.currentStyle = {
	 *	   fillColor: 'red',
	 *	   strokeColor: 'black',
	 *	   strokeWidth: 5
	 * }
	 *
	 * // The following paths will take over all style properties of
	 * // the current style:
	 * var path = new Path.Circle(new Point(75, 50), 30);
	 * var path2 = new Path.Circle(new Point(175, 50), 20);
	 *
	 * @example {@paperscript}
	 * project.currentStyle.fillColor = 'red';
	 *
	 * // The following path will take over the fill color we just set:
	 * var path = new Path.Circle(new Point(75, 50), 30);
	 * var path2 = new Path.Circle(new Point(175, 50), 20);
	 */
	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		// TODO: Style selected items with the style:
		this._currentStyle.initialize(style);
	},

	/**
	 * The index of the project in the {@link PaperScope#projects} list.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._index;
	},

	/**
	 * Gives access to the project's configurable options.
	 *
	 * @type Object
	 * @bean
	 * @deprecated use {@link PaperScope#settings} instead.
	 */
	getOptions: function() {
		return this._scope.settings;
	},

	/**
	 * {@grouptitle Project Content}
	 *
	 * The layers contained within the project.
	 *
	 * @name Project#layers
	 * @type Layer[]
	 */

	/**
	 * The layer which is currently active. New items will be created on this
	 * layer by default.
	 *
	 * @type Layer
	 * @bean
	 */
	getActiveLayer: function() {
		return this._activeLayer || new Layer({ project: this });
	},

	/**
	 * The symbols contained within the project.
	 *
	 * @name Project#symbols
	 * @type Symbol[]
	 */

	/**
	 * The selected items contained within the project.
	 *
	 * @type Item[]
	 * @bean
	 */
	getSelectedItems: function() {
		// TODO: Return groups if their children are all selected,
		// and filter out their children from the list.
		// TODO: The order of these items should be that of their
		// drawing order.
		var items = [];
		for (var id in this._selectedItems) {
			var item = this._selectedItems[id];
			if (item.isInserted())
				items.push(item);
		}
		return items;
	},

	// Project#insertChild() and #addChild() are helper functions called in
	// Item#copyTo(), Layer#initialize(), Layer#_insertSibling()
	// They are called the same as the functions on Item so duck-typing works.
	insertChild: function(index, item, _preserve) {
		if (item instanceof Layer) {
			item._remove(false, true);
			Base.splice(this.layers, [item], index, 0);
			item._setProject(this, true);
			// See Item#_remove() for an explanation of this:
			if (this._changes)
				item._changed(5);
			// TODO: this._changed(undefined);
			// Also activate this layer if there was none before
			if (!this._activeLayer)
				this._activeLayer = item;
		} else if (item instanceof Item) {
			// Anything else than layers needs to be added to a layer first
			(this._activeLayer
				// NOTE: If there is no layer and this project is not the active
				// one, passing insert: false and calling addChild on the
				// project will handle it correctly.
				|| this.insertChild(index, new Layer(Item.NO_INSERT)))
					.insertChild(index, item, _preserve);
		} else {
			item = null;
		}
		return item;
	},

	addChild: function(item, _preserve) {
		return this.insertChild(undefined, item, _preserve);
	},

	// TODO: Implement setSelectedItems?
	_updateSelection: function(item) {
		var id = item._id,
			selectedItems = this._selectedItems;
		if (item._selected) {
			if (selectedItems[id] !== item) {
				this._selectedItemCount++;
				selectedItems[id] = item;
			}
		} else if (selectedItems[id] === item) {
			this._selectedItemCount--;
			delete selectedItems[id];
		}
	},

	/**
	 * Selects all items in the project.
	 */
	selectAll: function() {
		var layers = this.layers;
		for (var i = 0, l = layers.length; i < l; i++)
			layers[i].setFullySelected(true);
	},

	/**
	 * Deselects all selected items in the project.
	 */
	deselectAll: function() {
		var selectedItems = this._selectedItems;
		for (var i in selectedItems)
			selectedItems[i].setFullySelected(false);
	},

	/**
	 * Perform a hit-test on the items contained within the project at the
	 * location of the specified point.
	 *
	 * The options object allows you to control the specifics of the hit-test
	 * and may contain a combination of the following values:
	 *
	 * @option [options.tolerance={@link PaperScope#settings}.hitTolerance]
	 * {Number} the tolerance of the hit-test
	 * @option options.class {Function} only hit-test again a certain item class
	 * and its sub-classes: {@code Group, Layer, Path, CompoundPath,
	 * Shape, Raster, PlacedSymbol, PointText}, etc
	 * @option options.fill {Boolean} hit-test the fill of items
	 * @option options.stroke {Boolean} hit-test the stroke of path items,
	 * taking into account the setting of stroke color and width
	 * @option options.segments {Boolean} hit-test for {@link Segment#point} of
	 * {@link Path} items
	 * @option options.curves {Boolean} hit-test the curves of path items,
	 * without taking the stroke color or width into account
	 * @option options.handles {Boolean} hit-test for the handles
	 * ({@link Segment#handleIn} / {@link Segment#handleOut}) of path segments.
	 * @option options.ends {Boolean} only hit-test for the first or last
	 * segment points of open path items
	 * @option options.bounds {Boolean} hit-test the corners and side-centers of
	 * the bounding rectangle of items ({@link Item#bounds})
	 * @option options.center {Boolean} hit-test the {@link Rectangle#center} of
	 * the bounding rectangle of items ({@link Item#bounds})
	 * @option options.guides {Boolean} hit-test items that have
	 * {@link Item#guide} set to {@code true}
	 * @option options.selected {Boolean} only hit selected items
	 *
	 * @param {Point} point the point where the hit-test should be performed
	 * @param {Object} [options={ fill: true, stroke: true, segments: true,
	 * tolerance: true }]
	 * @return {HitResult} a hit result object that contains more
	 * information about what exactly was hit or {@code null} if nothing was
	 * hit
	 */
	hitTest: function(/* point, options */) {
		// We don't need to do this here, but it speeds up things since we won't
		// repeatedly convert in Item#hitTest() then.
		var point = Point.read(arguments),
			options = HitResult.getOptions(Base.read(arguments));
		// Loop backwards, so layers that get drawn last are tested first
		for (var i = this.layers.length - 1; i >= 0; i--) {
			var res = this.layers[i]._hitTest(point, options);
			if (res) return res;
		}
		return null;
	},

	/**
	 * {@grouptitle Fetching and matching items}
	 *
	 * Fetch items contained within the project whose properties match the
	 * criteria in the specified object.
	 * Extended matching is possible by providing a compare function or
	 * regular expression. Matching points, colors only work as a comparison
	 * of the full object, not partial matching (e.g. only providing the x-
	 * coordinate to match all points with that x-value). Partial matching
	 * does work for {@link Item#data}.
	 * Matching items against a rectangular area is also possible, by setting
	 * either {@code match.inside} or {@code match.overlapping} to a rectangle
	 * describing the area in which the items either have to be fully or partly
	 * contained.
	 *
	 * @option match.inside {Rectangle} the rectangle in which the items need to
	 * be fully contained
	 * @option match.overlapping {Rectangle} the rectangle with which the items
	 * need to at least partly overlap
	 *
	 * @example {@paperscript} // Fetch all selected path items:
	 * var path1 = new Path.Circle({
	 *	   center: [50, 50],
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * var path2 = new Path.Circle({
	 *	   center: [150, 50],
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * // Select path2:
	 * path2.selected = true;
	 *
	 * // Fetch all selected path items:
	 * var items = project.getItems({
	 *	   selected: true,
	 *	   class: Path
	 * });
	 *
	 * // Change the fill color of the selected path to red:
	 * items[0].fillColor = 'red';
	 *
	 * @example {@paperscript} // Fetch all items with a specific fill color:
	 * var path1 = new Path.Circle({
	 *	   center: [50, 50],
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * var path2 = new Path.Circle({
	 *	   center: [150, 50],
	 *	   radius: 25,
	 *	   fillColor: 'purple'
	 * });
	 *
	 * // Fetch all items with a purple fill color:
	 * var items = project.getItems({
	 *	   fillColor: 'purple'
	 * });
	 *
	 * // Select the fetched item:
	 * items[0].selected = true;
	 *
	 * @example {@paperscript} // Fetch items at a specific position:
	 * var path1 = new Path.Circle({
	 *	   center: [50, 50],
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * var path2 = new Path.Circle({
	 *	   center: [150, 50],
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * // Fetch all path items positioned at {x: 150, y: 150}:
	 * var items = project.getItems({
	 *	   position: [150, 50]
	 * });
	 *
	 * // Select the fetched path:
	 * items[0].selected = true;
	 *
	 * @example {@paperscript} // Fetch items using a comparing function:
	 *
	 * // Create a circle shaped path:
	 * var path1 = new Path.Circle({
	 *	   center: [50, 50],
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * // Create a circle shaped path with 50% opacity:
	 * var path2 = new Path.Circle({
	 *	   center: [150, 50],
	 *	   radius: 25,
	 *	   fillColor: 'black',
	 *	   opacity: 0.5
	 * });
	 *
	 * // Fetch all items whose opacity is smaller than 1
	 * var items = paper.project.getItems({
	 *	   opacity: function(value) {
	 *		   return value < 1;
	 *	   }
	 * });
	 *
	 * // Select the fetched item:
	 * items[0].selected = true;
	 *
	 * @example {@paperscript} // Fetch items using a comparing function (2):
	 *
	 * // Create a rectangle shaped path (4 segments):
	 * var path1 = new Path.Rectangle({
	 *	   from: [25, 25],
	 *	   to: [75, 75],
	 *	   strokeColor: 'black',
	 *	   strokeWidth: 10
	 * });
	 *
	 * // Create a line shaped path (2 segments):
	 * var path2 = new Path.Line({
	 *	   from: [125, 50],
	 *	   to: [175, 50],
	 *	   strokeColor: 'black',
	 *	   strokeWidth: 10
	 * });
	 *
	 * // Fetch all paths with 2 segments:
	 * var items = project.getItems({
	 *	   class: Path,
	 *	segments: function(segments) {
	 *		   return segments.length == 2;
	 *	}
	 * });
	 *
	 * // Select the fetched path:
	 * items[0].selected = true;
	 *
	 * @example {@paperscript} // Match (nested) properties of the data property:
	 *
	 * // Create a black circle shaped path:
	 * var path1 = new Path.Circle({
	 *	   center: [50, 50],
	 *	   radius: 25,
	 *	   fillColor: 'black',
	 *	   data: {
	 *		   person: {
	 *			   name: 'john',
	 *			   length: 200,
	 *			   hair: true
	 *		   }
	 *	   }
	 * });
	 *
	 * // Create a red circle shaped path:
	 * var path2 = new Path.Circle({
	 *	   center: [150, 50],
	 *	   radius: 25,
	 *	   fillColor: 'red',
	 *	   data: {
	 *		   person: {
	 *			   name: 'john',
	 *			   length: 180,
	 *			   hair: false
	 *		   }
	 *	   }
	 * });
	 *
	 * // Fetch all items whose data object contains a person
	 * // object whose name is john and length is 180:
	 * var items = paper.project.getItems({
	 *	   data: {
	 *		   person: {
	 *			   name: 'john',
	 *			   length: 180
	 *		   }
	 *	   }
	 * });
	 *
	 * // Select the fetched item:
	 * items[0].selected = true;
	 *
	 * @example {@paperscript} // Match strings using regular expressions:
	 *
	 * // Create a path named 'aardvark':
	 * var path1 = new Path.Circle({
	 *	   center: [50, 50],
	 *	   radius: 25,
	 *	   fillColor: 'black',
	 *	   name: 'aardvark'
	 * });
	 *
	 * // Create a path named 'apple':
	 * var path2 = new Path.Circle({
	 *	   center: [150, 50],
	 *	   radius: 25,
	 *	   fillColor: 'black',
	 *	   name: 'apple'
	 * });
	 *
	 * // Create a path named 'banana':
	 * var path2 = new Path.Circle({
	 *	   center: [250, 50],
	 *	   radius: 25,
	 *	   fillColor: 'black',
	 *	   name: 'banana'
	 * });
	 *
	 * // Fetch all items that have a name starting with 'a':
	 * var items = project.getItems({
	 *	   name: /^a/
	 * });
	 *
	 * // Change the fill color of the matched items:
	 * for (var i = 0; i < items.length; i++) {
	 *	items[i].fillColor = 'red';
	 * }
	 *
	 * @see Item#matches(match)
	 * @see Item#getItems(match)
	 * @param {Object|Function} match the criteria to match against
	 * @return {Item[]} the list of matching items contained in the project
	 */
	getItems: function(match) {
		return Item._getItems(this.layers, match);
	},

	/**
	 * Fetch the first item contained within the project whose properties
	 * match the criteria in the specified object.
	 * Extended matching is possible by providing a compare function or
	 * regular expression. Matching points, colors only work as a comparison
	 * of the full object, not partial matching (e.g. only providing the x-
	 * coordinate to match all points with that x-value). Partial matching
	 * does work for {@link Item#data}.
	 * See {@link #getItems(match)} for a selection of illustrated examples.
	 *
	 * @param {Object|Function} match the criteria to match against
	 * @return {Item} the first item in the project matching the given criteria
	 */
	getItem: function(match) {
		return Item._getItems(this.layers, match, null, null, true)[0] || null;
	},

	/**
	 * {@grouptitle Importing / Exporting JSON and SVG}
	 *
	 * Exports (serializes) the project with all its layers and child items to
	 * a JSON data object or string.
	 *
	 * @name Project#exportJSON
	 * @function
	 *
	 * @option [options.asString=true] {Boolean} whether the JSON is returned as
	 * a {@code Object} or a {@code String}
	 * @option [options.precision=5] {Number} the amount of fractional digits in
	 * numbers used in JSON data
	 *
	 * @param {Object} [options] the serialization options
	 * @return {String} the exported JSON data
	 */

	/**
	 * Imports (deserializes) the stored JSON data into the project.
	 * Note that the project is not cleared first. You can call
	 * {@link Project#clear()} to do so.
	 *
	 * @param {String} json the JSON data to import from
	 */
	importJSON: function(json) {
		this.activate();
		// Provide the activeLayer as a possible target for layers, but only if
		// it's empty.
		var layer = this._activeLayer;
		return Base.importJSON(json, layer && layer.isEmpty() && layer);
	},

	/**
	 * Exports the project with all its layers and child items as an SVG DOM,
	 * all contained in one top level SVG group node.
	 *
	 * @name Project#exportSVG
	 * @function
	 *
	 * @option [options.asString=false] {Boolean} whether a SVG node or a
	 * {@code String} is to be returned
	 * @option [options.precision=5] {Number} the amount of fractional digits in
	 * numbers used in SVG data
	 * @option [options.matchShapes=false] {Boolean} whether path items should
	 * tried to be converted to SVG shape items (rect, circle, ellipse, line,
	 * polyline, polygon), if their geometries match
	 * @option [options.embedImages=true] {Boolean} whether raster images
	 * should be embedded as base64 data inlined in the xlink:href attribute,
	 * or kept as a link to their external URL.
	 *
	 * @param {Object} [options] the export options
	 * @return {SVGElement} the project converted to an SVG node
	 */

	/**
	 * Converts the provided SVG content into Paper.js items and adds them to
	 * the active layer of this project.
	 * Note that the project is not cleared first. You can call
	 * {@link Project#clear()} to do so.
	 *
	 * @name Project#importSVG
	 * @function
	 *
	 * @option [options.expandShapes=false] {Boolean} whether imported shape
	 * items should be expanded to path items
	 * @option [options.onLoad] {Function} the callback function to call once
	 * the SVG content is loaded from the given URL. Only required when loading
	 * from external files.
	 * @option [options.applyMatrix={@link PaperScope#settings}.applyMatrix]
	 * {Boolean} whether imported items should have their transformation
	 * matrices applied to their contents or not
	 *
	 * @param {SVGElement|String} svg the SVG content to import, either as a SVG
	 * DOM node, a string containing SVG content, or a string describing the URL
	 * of the SVG file to fetch.
	 * @param {Object} [options] the import options
	 * @return {Item} the newly created Paper.js item containing the converted
	 * SVG content
	 */
	/**
	 * Imports the provided external SVG file, converts it into Paper.js items
	 * and adds them to the active layer of this project.
	 * Note that the project is not cleared first. You can call
	 * {@link Project#clear()} to do so.
	 *
	 * @name Project#importSVG
	 * @function
	 *
	 * @param {SVGElement|String} svg the URL of the SVG file to fetch.
	 * @param {Function} onLoad the callback function to call once the SVG
	 * content is loaded from the given URL.
	 * @return {Item} the newly created Paper.js item containing the converted
	 * SVG content
	 */

	draw: function(ctx, matrix, pixelRatio) {
		// Increase the _updateVersion before the draw-loop. After that, items
		// that are visible will have their _updateVersion set to the new value.
		this._updateVersion++;
		ctx.save();
		matrix.applyToContext(ctx);
		// Use new Base() so we can use param.extend() to easily override values
		var param = new Base({
			offset: new Point(0, 0),
			pixelRatio: pixelRatio,
			viewMatrix: matrix.isIdentity() ? null : matrix,
			matrices: [new Matrix()], // Start with the identity matrix.
			// Tell the drawing routine that we want to keep _globalMatrix up to
			// date. Item#rasterize() and Raster#getAverageColor() should not
			// set this.
			updateMatrix: true
		});
		for (var i = 0, layers = this.layers, l = layers.length; i < l; i++)
			layers[i].draw(ctx, param);
		ctx.restore();

		// Draw the selection of the selected items in the project:
		if (this._selectedItemCount > 0) {
			ctx.save();
			ctx.strokeWidth = 1;
			var items = this._selectedItems,
				size = this._scope.settings.handleSize,
				version = this._updateVersion;
			for (var id in items)
				items[id]._drawSelection(ctx, matrix, size, items, version);
			ctx.restore();
		}
	}
});

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
 * @name Symbol
 *
 * @class Symbols allow you to place multiple instances of an item in your
 * project. This can save memory, since all instances of a symbol simply refer
 * to the original item and it can speed up moving around complex objects, since
 * internal properties such as segment lists and gradient positions don't need
 * to be updated with every transformation.
 */
var Symbol = Base.extend(/** @lends Symbol# */{
	_class: 'Symbol',

	/**
	 * Creates a Symbol item.
	 *
	 * @param {Item} item the source item which is copied as the definition of
	 * the symbol
	 * @param {Boolean} [dontCenter=false]
	 *
	 * @example {@paperscript split=true height=240}
	 * // Placing 100 instances of a symbol:
	 * var path = new Path.Star(new Point(0, 0), 6, 5, 13);
	 * path.style = {
	 *	   fillColor: 'white',
	 *	   strokeColor: 'black'
	 * };
	 *
	 * // Create a symbol from the path:
	 * var symbol = new Symbol(path);
	 *
	 * // Remove the path:
	 * path.remove();
	 *
	 * // Place 100 instances of the symbol:
	 * for (var i = 0; i < 100; i++) {
	 *	   // Place an instance of the symbol in the project:
	 *	   var instance = symbol.place();
	 *
	 *	   // Move the instance to a random position within the view:
	 *	   instance.position = Point.random() * view.size;
	 *
	 *	   // Rotate the instance by a random amount between
	 *	   // 0 and 360 degrees:
	 *	   instance.rotate(Math.random() * 360);
	 *
	 *	   // Scale the instance between 0.25 and 1:
	 *	   instance.scale(0.25 + Math.random() * 0.75);
	 * }
	 */
	initialize: function Symbol(item, dontCenter) {
		// Define this Symbols's unique id.
		this._id = UID.get();
		this.project = paper.project;
		this.project.symbols.push(this);
		if (item)
			this.setDefinition(item, dontCenter);
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this._class, this._definition],
					options, false, dictionary);
		});
	},

	// TODO: Symbol#remove()
	// TODO: Symbol#name (accessible by name through project#symbols)

	/**
	 * The project that this symbol belongs to.
	 *
	 * @type Project
	 * @readonly
	 * @name Symbol#project
	 */

	/**
	 * Private notifier that is called whenever a change occurs in this symbol's
	 * definition.
	 *
	 * @param {ChangeFlag} flags describes what exactly has changed
	 */
	_changed: function(flags) {
		if (flags & 8) {
			// Clear cached bounds of all items that this symbol is linked to.
			Item._clearBoundsCache(this);
		}
		if (flags & 1) {
			this.project._needsUpdate = true;
		}
	},

	/**
	 * The symbol definition.
	 *
	 * @type Item
	 * @bean
	 */
	getDefinition: function() {
		return this._definition;
	},

	setDefinition: function(item, _dontCenter) {
		// Make sure we're not stealing another symbol's definition
		if (item._parentSymbol)
			item = item.clone();
		// Remove previous definition's reference to this symbol
		if (this._definition)
			this._definition._parentSymbol = null;
		this._definition = item;
		// Remove item from DOM, as it's embedded in Symbol now.
		item.remove();
		item.setSelected(false);
		// Move position to 0, 0, so it's centered when placed.
		if (!_dontCenter)
			item.setPosition(new Point());
		item._parentSymbol = this;
		this._changed(9);
	},

	/**
	 * Places in instance of the symbol in the project.
	 *
	 * @param {Point} [position] the position of the placed symbol
	 * @return {PlacedSymbol}
	 */
	place: function(position) {
		return new PlacedSymbol(this, position);
	},

	/**
	 * Returns a copy of the symbol.
	 *
	 * @return {Symbol}
	 */
	clone: function() {
		return new Symbol(this._definition.clone(false));
	},

	/**
	 * Checks whether the symbol's definition is equal to the supplied symbol.
	 *
	 * @param {Symbol} symbol
	 * @return {Boolean} {@true if they are equal}
	 */
	equals: function(symbol) {
		return symbol === this
				|| symbol && this.definition.equals(symbol.definition)
				|| false;
	}
});


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
 * @name Item
 *
 * @class The Item type allows you to access and modify the items in
 * Paper.js projects. Its functionality is inherited by different project
 * item types such as {@link Path}, {@link CompoundPath}, {@link Group},
 * {@link Layer} and {@link Raster}. They each add a layer of functionality that
 * is unique to their type, but share the underlying properties and functions
 * that they inherit from Item.
 */
var Item = Base.extend(Emitter, /** @lends Item# */{
	statics: {
		/**
		 * Override Item.extend() to merge the subclass' _serializeFields with
		 * the parent class' _serializeFields.
		 *
		 * @private
		 */
		extend: function extend(src) {
			if (src._serializeFields)
				src._serializeFields = new Base(
						this.prototype._serializeFields, src._serializeFields);
			return extend.base.apply(this, arguments);
		},

		/**
		 * An object constant that can be passed to Item#initialize() to avoid
		 * insertion into the DOM.
		 *
		 * @private
		 */
		NO_INSERT: { insert: false }
	},

	_class: 'Item',
	// All items apply their matrix by default.
	// Exceptions are Raster, PlacedSymbol, Clip and Shape.
	_applyMatrix: true,
	_canApplyMatrix: true,
	_boundsSelected: false,
	_selectChildren: false,
	// Provide information about fields to be serialized, with their defaults
	// that can be ommited.
	_serializeFields: {
		name: null,
		applyMatrix: null,
		matrix: new Matrix(),
		pivot: null,
		locked: false,
		visible: true,
		blendMode: 'normal',
		opacity: 1,
		guide: false,
		selected: false,
		clipMask: false,
		data: {}
	},

	initialize: function Item() {
		// Do nothing, but declare it for named constructors.
	},

	/**
	 * Private helper for #initialize() that tries setting properties from the
	 * passed props object, and apply the point translation to the internal
	 * matrix.
	 *
	 * @param {Object} props the properties to be applied to the item
	 * @param {Point} point the point by which to transform the internal matrix
	 * @return {Boolean} {@true if the properties were successfully be applied,
	 * or if none were provided}
	 */
	_initialize: function(props, point) {
		// Define this Item's unique id. But allow the creation of internally
		// used paths with no ids.
		var hasProps = props && Base.isPlainObject(props),
			internal = hasProps && props.internal === true,
			matrix = this._matrix = new Matrix(),
			// Allow setting another project than the currently active one.
			project = hasProps && props.project || paper.project;
		if (!internal)
			this._id = UID.get();
		// Inherit the applyMatrix setting from paper.settings.applyMatrix
		this._applyMatrix = this._canApplyMatrix && paper.settings.applyMatrix;
		// Handle matrix before everything else, to avoid issues with
		// #addChild() calling _changed() and accessing _matrix already.
		if (point)
			matrix.translate(point);
		matrix._owner = this;
		this._style = new Style(project._currentStyle, this, project);
		// If _project is already set, the item was already moved into the DOM
		// hierarchy. Used by Layer, where it's added to project.layers instead
		if (!this._project) {
			// Do not insert into DOM if it's an internal path, if props.insert
			// is false, or if the props are setting a different parent anyway.
			if (internal || hasProps && props.insert === false) {
				this._setProject(project);
			} else if (hasProps && props.parent) {
				this.setParent(props.parent);
			} else {
				// Create a new layer if there is no active one. This will
				// automatically make it the new activeLayer.
				(project._activeLayer || new Layer()).addChild(this);
			}
		}
		// Filter out Item.NO_INSERT before _set(), for performance reasons.
		if (hasProps && props !== Item.NO_INSERT)
			// Filter out insert, parent and project properties as these were
			// handled above.
			this._set(props, { insert: true, project: true, parent: true },
					// Don't check for plain object as that's done by hasProps.
					true);
		return hasProps;
	},

	_events: Base.each(['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onClick',
			'onDoubleClick', 'onMouseMove', 'onMouseEnter', 'onMouseLeave'],
		function(name) {
			this[name] = {
				install: function(type) {
					this.getView()._installEvent(type);
				},

				uninstall: function(type) {
					this.getView()._uninstallEvent(type);
				}
			};
		}, {
			onFrame: {
				install: function() {
					this.getView()._animateItem(this, true);
				},

				uninstall: function() {
					this.getView()._animateItem(this, false);
				}
			},

			// Only for external sources, e.g. Raster
			onLoad: {}
		}
	),

	_serialize: function(options, dictionary) {
		var props = {},
			that = this;

		function serialize(fields) {
			for (var key in fields) {
				var value = that[key];
				// Style#leading is a special case, as its default value is
				// dependent on the fontSize. Handle this here separately.
				if (!Base.equals(value, key === 'leading'
						? fields.fontSize * 1.2 : fields[key])) {
					props[key] = Base.serialize(value, options,
							// Do not use compact mode for data
							key !== 'data', dictionary);
				}
			}
		}

		// Serialize fields that this Item subclass defines first
		serialize(this._serializeFields);
		// Serialize style fields, but only if they differ from defaults.
		// Do not serialize styles on Groups and Layers, since they just unify
		// their children's own styles.
		if (!(this instanceof Group))
			serialize(this._style._defaults);
		// There is no compact form for Item serialization, we always keep the
		// class.
		return [ this._class, props ];
	},

	/**
	 * Private notifier that is called whenever a change occurs in this item or
	 * its sub-elements, such as Segments, Curves, Styles, etc.
	 *
	 * @param {ChangeFlag} flags describes what exactly has changed
	 */
	_changed: function(flags) {
		var symbol = this._parentSymbol,
			cacheParent = this._parent || symbol,
			project = this._project;
		if (flags & 8) {
			// Clear cached bounds, position and decomposed matrix whenever
			// geometry changes. Also clear _currentPath since it can be used
			// both on compound-paths and clipping groups.
			this._bounds = this._position = this._decomposed =
					this._globalMatrix = this._currentPath = undefined;
		}
		if (cacheParent
				&& (flags & 40)) {
			// Clear cached bounds of all items that this item contributes to.
			// We call this on the parent, since the information is cached on
			// the parent, see getBounds().
			Item._clearBoundsCache(cacheParent);
		}
		if (flags & 2) {
			// Clear cached bounds of all items that this item contributes to.
			// Here we don't call this on the parent, since adding / removing a
			// child triggers this notification on the parent.
			Item._clearBoundsCache(this);
		}
		if (project) {
			if (flags & 1) {
				project._needsUpdate = true;
			}
			// Have project keep track of changed items so they can be iterated.
			// This can be used for example to update the SVG tree. Needs to be
			// activated in Project
			if (project._changes) {
				var entry = project._changesById[this._id];
				if (entry) {
					entry.flags |= flags;
				} else {
					entry = { item: this, flags: flags };
					project._changesById[this._id] = entry;
					project._changes.push(entry);
				}
			}
		}
		// If this item is a symbol's definition, notify it of the change too
		if (symbol)
			symbol._changed(flags);
	},

	/**
	 * Sets those properties of the passed object literal on this item to
	 * the values defined in the object literal, if the item has property of the
	 * given name (or a setter defined for it).
	 *
	 * @param {Object} props
	 * @return {Item} the item itself
	 *
	 * @example {@paperscript}
	 * // Setting properties through an object literal
	 * var circle = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35
	 * });
	 *
	 * circle.set({
	 *	   strokeColor: 'red',
	 *	   strokeWidth: 10,
	 *	   fillColor: 'black',
	 *	   selected: true
	 * });
	 */
	set: function(props) {
		if (props)
			this._set(props);
		return this;
	},

	/**
	 * The unique id of the item.
	 *
	 * @type Number
	 * @bean
	 */
	getId: function() {
		return this._id;
	},

	/**
	 * The class name of the item as a string.
	 *
	 * @name Item#className
	 * @type String('Group', 'Layer', 'Path', 'CompoundPath', 'Shape',
	 * 'Raster', 'PlacedSymbol', 'PointText')
	 */

	/**
	 * The name of the item. If the item has a name, it can be accessed by name
	 * through its parent's children list.
	 *
	 * @type String
	 * @bean
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35
	 * });

	 * // Set the name of the path:
	 * path.name = 'example';
	 *
	 * // Create a group and add path to it as a child:
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // The path can be accessed by name:
	 * group.children['example'].fillColor = 'red';
	 */
	getName: function() {
		return this._name;
	},

	setName: function(name, unique) {
		// Note: Don't check if the name has changed and bail out if it has not,
		// because setName is used internally also to update internal structures
		// when an item is moved from one parent to another.

		// If the item already had a name, remove the reference to it from the
		// parent's children object:
		if (this._name)
			this._removeNamed();
		// See if the name is a simple number, which we cannot support due to
		// the named lookup on the children array.
		if (name === (+name) + '')
			throw new Error(
					'Names consisting only of numbers are not supported.');
		var parent = this._parent;
		if (name && parent) {
			var children = parent._children,
				namedChildren = parent._namedChildren,
				orig = name,
				i = 1;
			// If unique is true, make sure we're not overriding other names
			while (unique && children[name])
				name = orig + ' ' + (i++);
			(namedChildren[name] = namedChildren[name] || []).push(this);
			children[name] = this;
		}
		this._name = name || undefined;
		this._changed(128);
	},

	/**
	 * The path style of the item.
	 *
	 * @name Item#getStyle
	 * @type Style
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Applying several styles to an item in one go, by passing an object
	 * // to its style property:
	 * var circle = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 30
	 * });
	 * circle.style = {
	 *	   fillColor: 'blue',
	 *	   strokeColor: 'red',
	 *	   strokeWidth: 5
	 * };
	 *
	 * @example {@paperscript split=true height=100}
	 * // Copying the style of another item:
	 * var path = new Path.Circle({
	 *	   center: [50, 50],
	 *	   radius: 30,
	 *	   fillColor: 'red'
	 * });
	 *
	 * var path2 = new Path.Circle({
	 *	   center: new Point(180, 50),
	 *	   radius: 20
	 * });
	 *
	 * // Copy the path style of path:
	 * path2.style = path.style;
	 *
	 * @example {@paperscript}
	 * // Applying the same style object to multiple items:
	 * var myStyle = {
	 *	   fillColor: 'red',
	 *	   strokeColor: 'blue',
	 *	   strokeWidth: 4
	 * };
	 *
	 * var path = new Path.Circle({
	 *	   center: [50, 50],
	 *	   radius: 30
	 * });
	 * path.style = myStyle;
	 *
	 * var path2 = new Path.Circle({
	 *	   center: new Point(150, 50),
	 *	   radius: 20
	 * });
	 * path2.style = myStyle;
	 */
	getStyle: function() {
		return this._style;
	},

	setStyle: function(style) {
		// Don't access _style directly so Path#getStyle() can be overriden for
		// CompoundPaths.
		this.getStyle().set(style);
	}
}, Base.each(['locked', 'visible', 'blendMode', 'opacity', 'guide'],
	// Produce getter/setters for properties. We need setters because we want to
	// call _changed() if a property was modified.
	function(name) {
		var part = Base.capitalize(name),
			name = '_' + name;
		this['get' + part] = function() {
			return this[name];
		};
		this['set' + part] = function(value) {
			if (value != this[name]) {
				this[name] = value;
				// #locked does not change appearance, all others do:
				this._changed(name === '_locked'
						? 128 : 129);
			}
		};
	},
{}), /** @lends Item# */{
	// Enforce creation of beans, as bean getters have hidden parameters.
	// See #getPosition() below.
	beans: true,

	// Note: These properties have their getter / setters produced in the
	// injection scope above.

	/**
	 * Specifies whether the item is locked.
	 *
	 * @name Item#locked
	 * @type Boolean
	 * @default false
	 * @ignore
	 */
	_locked: false,

	/**
	 * Specifies whether the item is visible. When set to {@code false}, the
	 * item won't be drawn.
	 *
	 * @name Item#visible
	 * @type Boolean
	 * @default true
	 *
	 * @example {@paperscript}
	 * // Hiding an item:
	 * var path = new Path.Circle({
	 *	   center: [50, 50],
	 *	   radius: 20,
	 *	   fillColor: 'red'
	 * });
	 *
	 * // Hide the path:
	 * path.visible = false;
	 */
	_visible: true,

	/**
	 * The blend mode with which the item is composited onto the canvas. Both
	 * the standard canvas compositing modes, as well as the new CSS blend modes
	 * are supported. If blend-modes cannot be rendered natively, they are
	 * emulated. Be aware that emulation can have an impact on performance.
	 *
	 * @name Item#blendMode
	 * @type String('normal', 'multiply', 'screen', 'overlay', 'soft-light',
	 * 'hard-light', 'color-dodge', 'color-burn', 'darken', 'lighten',
	 * 'difference', 'exclusion', 'hue', 'saturation', 'luminosity', 'color',
	 * 'add', 'subtract', 'average', 'pin-light', 'negation', 'source-over',
	 * 'source-in', 'source-out', 'source-atop', 'destination-over',
	 * 'destination-in', 'destination-out', 'destination-atop', 'lighter',
	 * 'darker', 'copy', 'xor')
	 * @default 'normal'
	 *
	 * @example {@paperscript}
	 * // Setting an item's blend mode:
	 *
	 * // Create a white rectangle in the background
	 * // with the same dimensions as the view:
	 * var background = new Path.Rectangle(view.bounds);
	 * background.fillColor = 'white';
	 *
	 * var circle = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35,
	 *	   fillColor: 'red'
	 * });
	 *
	 * var circle2 = new Path.Circle({
	 *	   center: new Point(120, 50),
	 *	   radius: 35,
	 *	   fillColor: 'blue'
	 * });
	 *
	 * // Set the blend mode of circle2:
	 * circle2.blendMode = 'multiply';
	 */
	_blendMode: 'normal',

	/**
	 * The opacity of the item as a value between {@code 0} and {@code 1}.
	 *
	 * @name Item#opacity
	 * @type Number
	 * @default 1
	 *
	 * @example {@paperscript}
	 * // Making an item 50% transparent:
	 * var circle = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35,
	 *	   fillColor: 'red'
	 * });
	 *
	 * var circle2 = new Path.Circle({
	 *	   center: new Point(120, 50),
	 *	   radius: 35,
	 *	   fillColor: 'blue',
	 *	   strokeColor: 'green',
	 *	   strokeWidth: 10
	 * });
	 *
	 * // Make circle2 50% transparent:
	 * circle2.opacity = 0.5;
	 */
	_opacity: 1,

	// TODO: Implement guides
	/**
	 * Specifies whether the item functions as a guide. When set to
	 * {@code true}, the item will be drawn at the end as a guide.
	 *
	 * @name Item#guide
	 * @type Boolean
	 * @default true
	 * @ignore
	 */
	_guide: false,

	/**
	 * Specifies whether the item is selected. This will also return
	 * {@code true} for {@link Group} items if they are partially selected, e.g.
	 * groups containing selected or partially selected paths.
	 *
	 * Paper.js draws the visual outlines of selected items on top of your
	 * project. This can be useful for debugging, as it allows you to see the
	 * construction of paths, position of path curves, individual segment points
	 * and bounding boxes of symbol and raster items.
	 *
	 * @type Boolean
	 * @default false
	 * @bean
	 * @see Project#selectedItems
	 * @see Segment#selected
	 * @see Curve#selected
	 * @see Point#selected
	 *
	 * @example {@paperscript}
	 * // Selecting an item:
	 * var path = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35
	 * });
	 * path.selected = true; // Select the path
	 */
	isSelected: function() {
		if (this._selectChildren) {
			var children = this._children;
			for (var i = 0, l = children.length; i < l; i++)
				if (children[i].isSelected())
					return true;
		}
		return this._selected;
	},

	setSelected: function(selected, noChildren) {
		// Don't recursively call #setSelected() if it was called with
		// noChildren set to true, see #setFullySelected().
		if (!noChildren && this._selectChildren) {
			var children = this._children;
			for (var i = 0, l = children.length; i < l; i++)
				children[i].setSelected(selected);
		}
		if ((selected = !!selected) ^ this._selected) {
			this._selected = selected;
			this._project._updateSelection(this);
			this._changed(129);
		}
	},

	_selected: false,

	isFullySelected: function() {
		var children = this._children;
		if (children && this._selected) {
			for (var i = 0, l = children.length; i < l; i++)
				if (!children[i].isFullySelected())
					return false;
			return true;
		}
		// If there are no children, this is the same as #selected
		return this._selected;
	},

	setFullySelected: function(selected) {
		var children = this._children;
		if (children) {
			for (var i = 0, l = children.length; i < l; i++)
				children[i].setFullySelected(selected);
		}
		// Pass true for hidden noChildren argument
		this.setSelected(selected, true);
	},

	/**
	 * Specifies whether the item defines a clip mask. This can only be set on
	 * paths, compound paths, and text frame objects, and only if the item is
	 * already contained within a clipping group.
	 *
	 * @type Boolean
	 * @default false
	 * @bean
	 */
	isClipMask: function() {
		return this._clipMask;
	},

	setClipMask: function(clipMask) {
		// On-the-fly conversion to boolean:
		if (this._clipMask != (clipMask = !!clipMask)) {
			this._clipMask = clipMask;
			if (clipMask) {
				this.setFillColor(null);
				this.setStrokeColor(null);
			}
			this._changed(129);
			// Tell the parent the clipping mask has changed
			if (this._parent)
				this._parent._changed(1024);
		}
	},

	_clipMask: false,

	// TODO: get/setIsolated (print specific feature)
	// TODO: get/setKnockout (print specific feature)
	// TODO: get/setAlphaIsShape

	/**
	 * A plain javascript object which can be used to store
	 * arbitrary data on the item.
	 *
	 * @type Object
	 * @bean
	 *
	 * @example
	 * var path = new Path();
	 * path.data.remember = 'milk';
	 *
	 * @example
	 * var path = new Path();
	 * path.data.malcolm = new Point(20, 30);
	 * console.log(path.data.malcolm.x); // 20
	 *
	 * @example
	 * var path = new Path();
	 * path.data = {
	 *	   home: 'Omicron Theta',
	 *	   found: 2338,
	 *	   pets: ['Spot']
	 * };
	 * console.log(path.data.pets.length); // 1
	 *
	 * @example
	 * var path = new Path({
	 *	   data: {
	 *		   home: 'Omicron Theta',
	 *		   found: 2338,
	 *		   pets: ['Spot']
	 *	   }
	 * });
	 * console.log(path.data.pets.length); // 1
	 */
	getData: function() {
		if (!this._data)
			this._data = {};
		return this._data;
	},

	setData: function(data) {
		this._data = data;
	},

	/**
	 * {@grouptitle Position and Bounding Boxes}
	 *
	 * The item's position within the parent item's coordinate system. By
	 * default, this is the {@link Rectangle#center} of the item's
	 * {@link #bounds} rectangle.
	 *
	 * @type Point
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Changing the position of a path:
	 *
	 * // Create a circle at position { x: 10, y: 10 }
	 * var circle = new Path.Circle({
	 *	   center: new Point(10, 10),
	 *	   radius: 10,
	 *	   fillColor: 'red'
	 * });
	 *
	 * // Move the circle to { x: 20, y: 20 }
	 * circle.position = new Point(20, 20);
	 *
	 * // Move the circle 100 points to the right and 50 points down
	 * circle.position += new Point(100, 50);
	 *
	 * @example {@paperscript split=true height=100}
	 * // Changing the x coordinate of an item's position:
	 *
	 * // Create a circle at position { x: 20, y: 20 }
	 * var circle = new Path.Circle({
	 *	   center: new Point(20, 20),
	 *	   radius: 10,
	 *	   fillColor: 'red'
	 * });
	 *
	 * // Move the circle 100 points to the right
	 * circle.position.x += 100;
	 */
	getPosition: function(_dontLink) {
		// Cache position value.
		// Pass true for _dontLink in getCenter(), so receive back a normal point
		var position = this._position,
			ctor = _dontLink ? Point : LinkedPoint;
		// Do not cache LinkedPoints directly, since we would not be able to
		// use them to calculate the difference in #setPosition, as when it is
		// modified, it would hold new values already and only then cause the
		// calling of #setPosition.
		if (!position) {
			// If an pivot point is provided, use it to determine position
			// based on the matrix. Otherwise use the center of the bounds.
			var pivot = this._pivot;
			position = this._position = pivot
					? this._matrix._transformPoint(pivot)
					: this.getBounds().getCenter(true);
		}
		return new ctor(position.x, position.y, this, 'setPosition');
	},

	setPosition: function(/* point */) {
		// Calculate the distance to the current position, by which to
		// translate the item. Pass true for _dontLink, as we do not need a
		// LinkedPoint to simply calculate this distance.
		this.translate(Point.read(arguments).subtract(this.getPosition(true)));
	},

	/**
	 * The item's pivot point specified in the item coordinate system, defining
	 * the point around which all transformations are hinging. This is also the
	 * reference point for {@link #position}. By default, it is set to
	 * {@code null}, meaning the {@link Rectangle#center} of the item's
	 * {@link #bounds} rectangle is used as pivot.
	 *
	 * @type Point
	 * @bean
	 * @default null
	 */
	getPivot: function(_dontLink) {
		var pivot = this._pivot;
		if (pivot) {
			var ctor = _dontLink ? Point : LinkedPoint;
			pivot = new ctor(pivot.x, pivot.y, this, 'setPivot');
		}
		return pivot;
	},

	setPivot: function(/* point */) {
		// Clone existing points since we're caching internally.
		this._pivot = Point.read(arguments, 0, { clone: true, readNull: true });
		// No need for _changed() since the only thing this affects is _position
		this._position = undefined;
	},

	_pivot: null,
}, Base.each(['bounds', 'strokeBounds', 'handleBounds', 'roughBounds',
		'internalBounds', 'internalRoughBounds'],
	function(key) {
		// Produce getters for bounds properties. These handle caching, matrices
		// and redirect the call to the private _getBounds, which can be
		// overridden by subclasses, see below.
		// Treat internalBounds and internalRoughBounds untransformed, as
		// required by the code that uses these methods internally, but make
		// sure they can be cached like all the others as well.
		// Pass on the getter that these version actually use, untransformed,
		// as internalGetter.
		// NOTE: These need to be versions of other methods, as otherwise the
		// cache gets messed up.
		var getter = 'get' + Base.capitalize(key),
			match = key.match(/^internal(.*)$/),
			internalGetter = match ? 'get' + match[1] : null;
		this[getter] = function(_matrix) {
			var boundsGetter = this._boundsGetter,
				// Allow subclasses to override _boundsGetter if they use the
				// same calculations for multiple type of bounds.
				// The default is getter:
				name = !internalGetter && (typeof boundsGetter === 'string'
						? boundsGetter : boundsGetter && boundsGetter[getter])
						|| getter,
				bounds = this._getCachedBounds(name, _matrix, this,
						internalGetter);
			// If we're returning 'bounds', create a LinkedRectangle that uses
			// the setBounds() setter to update the Item whenever the bounds are
			// changed:
			return key === 'bounds'
					? new LinkedRectangle(bounds.x, bounds.y, bounds.width,
							bounds.height, this, 'setBounds')
					: bounds;
		};
	},
/** @lends Item# */{
	// Enforce creation of beans, as bean getters have hidden parameters.
	// See _matrix parameter above.
	beans: true,

	/**
	 * Protected method used in all the bounds getters. It loops through all the
	 * children, gets their bounds and finds the bounds around all of them.
	 * Subclasses override it to define calculations for the various required
	 * bounding types.
	 */
	_getBounds: function(getter, matrix, cacheItem) {
		// Note: We cannot cache these results here, since we do not get
		// _changed() notifications here for changing geometry in children.
		// But cacheName is used in sub-classes such as PlacedSymbol and Raster.
		var children = this._children;
		// TODO: What to return if nothing is defined, e.g. empty Groups?
		// Scriptographer behaves weirdly then too.
		if (!children || children.length == 0)
			return new Rectangle();
		// Call _updateBoundsCache() even when the group is currently empty
		// (or only holds empty / invisible items), so future changes in these
		// items will cause right handling of _boundsCache.
		Item._updateBoundsCache(this, cacheItem);
		var x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i];
			if (child._visible && !child.isEmpty()) {
				var rect = child._getCachedBounds(getter,
						matrix && matrix.chain(child._matrix), cacheItem);
				x1 = Math.min(rect.x, x1);
				y1 = Math.min(rect.y, y1);
				x2 = Math.max(rect.x + rect.width, x2);
				y2 = Math.max(rect.y + rect.height, y2);
			}
		}
		return isFinite(x1)
				? new Rectangle(x1, y1, x2 - x1, y2 - y1)
				: new Rectangle();
	},

	setBounds: function(/* rect */) {
		var rect = Rectangle.read(arguments),
			bounds = this.getBounds(),
			matrix = new Matrix(),
			center = rect.getCenter();
		// Read this from bottom to top:
		// Translate to new center:
		matrix.translate(center);
		// Scale to new Size, if size changes and avoid divisions by 0:
		if (rect.width != bounds.width || rect.height != bounds.height) {
			matrix.scale(
					bounds.width != 0 ? rect.width / bounds.width : 1,
					bounds.height != 0 ? rect.height / bounds.height : 1);
		}
		// Translate to bounds center:
		center = bounds.getCenter();
		matrix.translate(-center.x, -center.y);
		// Now execute the transformation
		this.transform(matrix);
	},

	/**
	 * Private method that deals with the calling of _getBounds, recursive
	 * matrix concatenation and handles all the complicated caching mechanisms.
	 */
	_getCachedBounds: function(getter, matrix, cacheItem, internalGetter) {
		// See if we can cache these bounds. We only cache the bounds
		// transformed with the internally stored _matrix, (the default if no
		// matrix is passed).
		matrix = matrix && matrix.orNullIfIdentity();
		// Do not transform by the internal matrix if there is a internalGetter.
		var _matrix = internalGetter ? null : this._matrix.orNullIfIdentity(),
			cache = (!matrix || matrix.equals(_matrix)) && getter;
		// Note: This needs to happen before returning cached values, since even
		// then, _boundsCache needs to be kept up-to-date.
		Item._updateBoundsCache(this._parent || this._parentSymbol, cacheItem);
		if (cache && this._bounds && this._bounds[cache])
			return this._bounds[cache].clone();
		// If we're caching bounds on this item, pass it on as cacheItem, so the
		// children can setup the _boundsCache structures for it.
		// getInternalBounds is getBounds untransformed. Do not replace earlier,
		// so we can cache both separately, since they're not in the same
		// transformation space!
		var bounds = this._getBounds(internalGetter || getter,
				matrix || _matrix, cacheItem);
		// If we can cache the result, update the _bounds cache structure
		// before returning
		if (cache) {
			if (!this._bounds)
				this._bounds = {};
			var cached = this._bounds[cache] = bounds.clone();
			// Mark as internal, so Item#transform() won't transform it!
			cached._internal = !!internalGetter;
		}
		return bounds;
	},

	statics: {
		/**
		 * Set up a boundsCache structure that keeps track of items that keep
		 * cached bounds that depend on this item. We store this in the parent,
		 * for multiple reasons:
		 * The parent receives CHILDREN change notifications for when its
		 * children are added or removed and can thus clear the cache, and we
		 * save a lot of memory, e.g. when grouping 100 items and asking the
		 * group for its bounds. If stored on the children, we would have 100
		 * times the same structure.
		 */
		_updateBoundsCache: function(parent, item) {
			if (parent) {
				// Set-up the parent's boundsCache structure if it does not
				// exist yet and add the item to it.
				var id = item._id,
					ref = parent._boundsCache = parent._boundsCache || {
						// Use a hash-table for ids and an array for the list,
						// so we can keep track of items that were added already
						ids: {},
						list: []
					};
				if (!ref.ids[id]) {
					ref.list.push(item);
					ref.ids[id] = item;
				}
			}
		},

		/**
		 * Clears cached bounds of all items that the children of this item are
		 * contributing to. See _updateBoundsCache() for an explanation why this
		 * information is stored on parents, not the children themselves.
		 */
		_clearBoundsCache: function(item) {
			// This is defined as a static method so Symbol can used it too.
			// Clear the position as well, since it's depending on bounds.
			var cache = item._boundsCache;
			if (cache) {
				// Erase cache before looping, to prevent circular recursion.
				item._bounds = item._position = item._boundsCache = undefined;
				for (var i = 0, list = cache.list, l = list.length; i < l; i++){
					var other = list[i];
					if (other !== item) {
						other._bounds = other._position = undefined;
						// We need to recursively call _clearBoundsCache, as
						// when the cache for the other item's children is not
						// valid anymore, that propagates up the DOM tree.
						if (other._boundsCache)
							Item._clearBoundsCache(other);
					}
				}
			}
		}
	}

	/**
	 * The bounding rectangle of the item excluding stroke width.
	 *
	 * @name Item#bounds
	 * @type Rectangle
	 */

	/**
	 * The bounding rectangle of the item including stroke width.
	 *
	 * @name Item#strokeBounds
	 * @type Rectangle
	 */

	/**
	 * The bounding rectangle of the item including handles.
	 *
	 * @name Item#handleBounds
	 * @type Rectangle
	 */

	/**
	 * The rough bounding rectangle of the item that is sure to include all of
	 * the drawing, including stroke width.
	 *
	 * @name Item#roughBounds
	 * @type Rectangle
	 * @ignore
	 */
}), /** @lends Item# */{
	// Enforce creation of beans, as bean getters have hidden parameters.
	// See #getGlobalMatrix() below.
	beans: true,

	_decompose: function() {
		return this._decomposed = this._matrix.decompose();
	},

	/**
	 * The current rotation angle of the item, as described by its
	 * {@link #matrix}.
	 *
	 * @type Number
	 * @bean
	 */
	getRotation: function() {
		var decomposed = this._decomposed || this._decompose();
		return decomposed && decomposed.rotation;
	},

	setRotation: function(rotation) {
		var current = this.getRotation();
		if (current != null && rotation != null) {
			// Preserve the cached _decomposed values over rotation, and only
			// update the rotation property on it.
			var decomposed = this._decomposed;
			this.rotate(rotation - current);
			decomposed.rotation = rotation;
			this._decomposed = decomposed;
		}
	},

	/**
	 * The current scale factor of the item, as described by its
	 * {@link #matrix}.
	 *
	 * @type Point
	 * @bean
	 */
	getScaling: function(_dontLink) {
		var decomposed = this._decomposed || this._decompose(),
			scaling = decomposed && decomposed.scaling,
			ctor = _dontLink ? Point : LinkedPoint;
		return scaling && new ctor(scaling.x, scaling.y, this, 'setScaling');
	},

	setScaling: function(/* scaling */) {
		var current = this.getScaling();
		if (current) {
			// Clone existing points since we're caching internally.
			var scaling = Point.read(arguments, 0, { clone: true }),
				// See #setRotation() for preservation of _decomposed.
				decomposed = this._decomposed;
			this.scale(scaling.x / current.x, scaling.y / current.y);
			decomposed.scaling = scaling;
			this._decomposed = decomposed;
		}
	},

	/**
	 * The item's transformation matrix, defining position and dimensions in
	 * relation to its parent item in which it is contained.
	 *
	 * @type Matrix
	 * @bean
	 */
	getMatrix: function() {
		return this._matrix;
	},

	setMatrix: function() {
		// Use Matrix#initialize to easily copy over values.
		var matrix = this._matrix;
		matrix.initialize.apply(matrix, arguments);
		if (this._applyMatrix) {
			// Directly apply the internal matrix. This will also call
			// _changed() for us.
			this.transform(null, true);
		} else {
			this._changed(9);
		}
	},

	/**
	 * The item's global transformation matrix in relation to the global project
	 * coordinate space. Note that the view's transformations resulting from
	 * zooming and panning are not factored in.
	 *
	 * @type Matrix
	 * @bean
	 */
	getGlobalMatrix: function(_dontClone) {
		var matrix = this._globalMatrix,
			updateVersion = this._project._updateVersion;
		// If #_globalMatrix is out of sync, recalculate it now.
		if (matrix && matrix._updateVersion !== updateVersion)
			matrix = null;
		if (!matrix) {
			matrix = this._globalMatrix = this._matrix.clone();
			var parent = this._parent;
			if (parent)
				matrix.preConcatenate(parent.getGlobalMatrix(true));
			matrix._updateVersion = updateVersion;
		}
		return _dontClone ? matrix : matrix.clone();
	},

	/**
	 * Controls whether the transformations applied to the item (e.g. through
	 * {@link #transform(matrix)}, {@link #rotate(angle)},
	 * {@link #scale(scale)}, etc.) are stored in its {@link #matrix} property,
	 * or whether they are directly applied to its contents or children (passed
	 * on to the segments in {@link Path} items, the children of {@link Group}
	 * items, etc.).
	 *
	 * @type Boolean
	 * @default true
	 * @bean
	 */
	getApplyMatrix: function() {
		return this._applyMatrix;
	},

	setApplyMatrix: function(apply) {
		// Tell #transform() to apply the internal matrix if _applyMatrix
		// can be set to true.
		if (this._applyMatrix = this._canApplyMatrix && !!apply)
			this.transform(null, true);
	},

	/**
	 * @bean
	 * @deprecated use {@link #applyMatrix} instead.
	 */
	getTransformContent: '#getApplyMatrix',
	setTransformContent: '#setApplyMatrix',
}, /** @lends Item# */{
	/**
	 * {@grouptitle Project Hierarchy}
	 * The project that this item belongs to.
	 *
	 * @type Project
	 * @bean
	 */
	getProject: function() {
		return this._project;
	},

	_setProject: function(project, installEvents) {
		if (this._project !== project) {
			// Uninstall events before switching project, then install them
			// again.
			// NOTE: _installEvents handles all children too!
			if (this._project)
				this._installEvents(false);
			this._project = project;
			var children = this._children;
			for (var i = 0, l = children && children.length; i < l; i++)
				children[i]._setProject(project);
			// We need to call _installEvents(true) again, but merge it with
			// handling of installEvents argument below.
			installEvents = true;
		}
		if (installEvents)
			this._installEvents(true);
	},

	/**
	 * The view that this item belongs to.
	 * @type View
	 * @bean
	 */
	getView: function() {
		return this._project.getView();
	},

	/**
	 * Overrides Emitter#_installEvents to also call _installEvents on all
	 * children.
	 */
	_installEvents: function _installEvents(install) {
		_installEvents.base.call(this, install);
		var children = this._children;
		for (var i = 0, l = children && children.length; i < l; i++)
			children[i]._installEvents(install);
	},

	/**
	 * The layer that this item is contained within.
	 *
	 * @type Layer
	 * @bean
	 */
	getLayer: function() {
		var parent = this;
		while (parent = parent._parent) {
			if (parent instanceof Layer)
				return parent;
		}
		return null;
	},

	/**
	 * The item that this item is contained within.
	 *
	 * @type Item
	 * @bean
	 *
	 * @example
	 * var path = new Path();
	 *
	 * // New items are placed in the active layer:
	 * console.log(path.parent == project.activeLayer); // true
	 *
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // Now the parent of the path has become the group:
	 * console.log(path.parent == group); // true
	 *
	 * @example // Setting the parent of the item to another item
	 * var path = new Path();
	 *
	 * // New items are placed in the active layer:
	 * console.log(path.parent == project.activeLayer); // true
	 *
	 * var group = new Group();
	 * group.parent = path;
	 *
	 * // Now the parent of the path has become the group:
	 * console.log(path.parent == group); // true
	 *
	 * // The path is now contained in the children list of group:
	 * console.log(group.children[0] == path); // true
	 *
	 * @example // Setting the parent of an item in the constructor
	 * var group = new Group();
	 *
	 * var path = new Path({
	 *	   parent: group
	 * });
	 *
	 * // The parent of the path is the group:
	 * console.log(path.parent == group); // true
	 *
	 * // The path is contained in the children list of group:
	 * console.log(group.children[0] == path); // true
	 */
	getParent: function() {
		return this._parent;
	},

	setParent: function(item) {
		return item.addChild(this);
	},

	/**
	 * The children items contained within this item. Items that define a
	 * {@link #name} can also be accessed by name.
	 *
	 * <b>Please note:</b> The children array should not be modified directly
	 * using array functions. To remove single items from the children list, use
	 * {@link Item#remove()}, to remove all items from the children list, use
	 * {@link Item#removeChildren()}. To add items to the children list, use
	 * {@link Item#addChild(item)} or {@link Item#insertChild(index,item)}.
	 *
	 * @type Item[]
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Accessing items in the children array:
	 * var path = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35
	 * });
	 *
	 * // Create a group and move the path into it:
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // Access the path through the group's children array:
	 * group.children[0].fillColor = 'red';
	 *
	 * @example {@paperscript}
	 * // Accessing children by name:
	 * var path = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35
	 * });
	 * // Set the name of the path:
	 * path.name = 'example';
	 *
	 * // Create a group and move the path into it:
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // The path can be accessed by name:
	 * group.children['example'].fillColor = 'orange';
	 *
	 * @example {@paperscript}
	 * // Passing an array of items to item.children:
	 * var path = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35
	 * });
	 *
	 * var group = new Group();
	 * group.children = [path];
	 *
	 * // The path is the first child of the group:
	 * group.firstChild.fillColor = 'green';
	 */
	getChildren: function() {
		return this._children;
	},

	setChildren: function(items) {
		this.removeChildren();
		this.addChildren(items);
	},

	/**
	 * The first item contained within this item. This is a shortcut for
	 * accessing {@code item.children[0]}.
	 *
	 * @type Item
	 * @bean
	 */
	getFirstChild: function() {
		return this._children && this._children[0] || null;
	},

	/**
	 * The last item contained within this item.This is a shortcut for
	 * accessing {@code item.children[item.children.length - 1]}.
	 *
	 * @type Item
	 * @bean
	 */
	getLastChild: function() {
		return this._children && this._children[this._children.length - 1]
				|| null;
	},

	/**
	 * The next item on the same level as this item.
	 *
	 * @type Item
	 * @bean
	 */
	getNextSibling: function() {
		return this._parent && this._parent._children[this._index + 1] || null;
	},

	/**
	 * The previous item on the same level as this item.
	 *
	 * @type Item
	 * @bean
	 */
	getPreviousSibling: function() {
		return this._parent && this._parent._children[this._index - 1] || null;
	},

	/**
	 * The index of this item within the list of its parent's children.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._index;
	},

	equals: function(item) {
		// Note: We do not compare name and selected state.
		// TODO: Consider not comparing locked and visible also?
		return item === this || item && this._class === item._class
				&& this._style.equals(item._style)
				&& this._matrix.equals(item._matrix)
				&& this._locked === item._locked
				&& this._visible === item._visible
				&& this._blendMode === item._blendMode
				&& this._opacity === item._opacity
				&& this._clipMask === item._clipMask
				&& this._guide === item._guide
				&& this._equals(item)
				|| false;
	},

	/**
	 * A private helper for #equals(), to be overridden in sub-classes. When it
	 * is called, item is always defined, of the same class as `this` and has
	 * equal general state attributes such as matrix, style, opacity, etc.
	 */
	_equals: function(item) {
		return Base.equals(this._children, item._children);
	},

	/**
	 * Clones the item within the same project and places the copy above the
	 * item.
	 *
	 * @param {Boolean} [insert=true] specifies whether the copy should be
	 * inserted into the DOM. When set to {@code true}, it is inserted above the
	 * original
	 * @return {Item} the newly cloned item
	 *
	 * @example {@paperscript}
	 * // Cloning items:
	 * var circle = new Path.Circle({
	 *	   center: [50, 50],
	 *	   radius: 10,
	 *	   fillColor: 'red'
	 * });
	 *
	 * // Make 20 copies of the circle:
	 * for (var i = 0; i < 20; i++) {
	 *	   var copy = circle.clone();
	 *
	 *	   // Distribute the copies horizontally, so we can see them:
	 *	   copy.position.x += i * copy.bounds.width;
	 * }
	 */
	clone: function(insert) {
		return this._clone(new this.constructor(Item.NO_INSERT), insert);
	},

	/**
	 * Clones the item within the same project and places the copy above the
	 * item.
	 *
	 * @param {Boolean} [insert=true] specifies whether the copy should be
	 * inserted into the DOM. When set to {@code true}, it is inserted above the
	 * original
	 * @return {Item} the newly cloned item
	 */
	_clone: function(copy, insert, includeMatrix) {
		var keys = ['_locked', '_visible', '_blendMode', '_opacity',
				'_clipMask', '_guide'],
			children = this._children;
		// Copy over style
		copy.setStyle(this._style);
		// Clone all children and add them to the copy. tell #addChild we're
		// cloning, as needed by CompoundPath#insertChild().
		for (var i = 0, l = children && children.length; i < l; i++) {
			copy.addChild(children[i].clone(false), true);
		}
		// Only copy over these fields if they are actually defined in 'this',
		// meaning the default value has been overwritten (default is on
		// prototype).
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			if (this.hasOwnProperty(key))
				copy[key] = this[key];
		}
		// Use Matrix#initialize to easily copy over values.
		if (includeMatrix !== false)
			copy._matrix.initialize(this._matrix);
		// In case of Path#toShape(), we can't just set _applyMatrix as
		// Shape won't allow it. Using the setter instead takes care of it.
		// NOTE: This will also bake in the matrix that we just initialized,
		// in case #applyMatrix is true.
		copy.setApplyMatrix(this._applyMatrix);
		copy.setPivot(this._pivot);
		// Copy over the selection state, use setSelected so the item
		// is also added to Project#selectedItems if it is selected.
		copy.setSelected(this._selected);
		// Copy over _data as well.
		copy._data = this._data ? Base.clone(this._data) : null;
		// Insert is true by default.
		if (insert || insert === undefined)
			copy.insertAbove(this);
		// Clone the name too, but make sure we're not overriding the original
		// in the same parent, by passing true for the unique parameter.
		if (this._name)
			copy.setName(this._name, true);
		return copy;
	},

	/**
	 * When passed a project, copies the item to the project,
	 * or duplicates it within the same project. When passed an item,
	 * copies the item into the specified item.
	 *
	 * @param {Project|Layer|Group|CompoundPath} item the item or project to
	 * copy the item to
	 * @return {Item} the new copy of the item
	 */
	copyTo: function(itemOrProject) {
		// Pass false fo insert, since we're inserting at a specific location.
		return itemOrProject.addChild(this.clone(false));
	},

	/**
	 * Rasterizes the item into a newly created Raster object. The item itself
	 * is not removed after rasterization.
	 *
	 * @param {Number} [resolution=view.resolution] the resolution of the raster
	 * in pixels per inch (DPI). If not specified, the value of
	 * {@code view.resolution} is used.
	 * @return {Raster} the newly created raster item
	 *
	 * @example {@paperscript}
	 * // Rasterizing an item:
	 * var circle = new Path.Circle({
	 *	   center: [50, 50],
	 *	   radius: 5,
	 *	   fillColor: 'red'
	 * });
	 *
	 * // Create a rasterized version of the path:
	 * var raster = circle.rasterize();
	 *
	 * // Move it 100pt to the right:
	 * raster.position.x += 100;
	 *
	 * // Scale the path and the raster by 300%, so we can compare them:
	 * circle.scale(5);
	 * raster.scale(5);
	 */
	rasterize: function(resolution) {
		var bounds = this.getStrokeBounds(),
			scale = (resolution || this.getView().getResolution()) / 72,
			// Floor top-left corner and ceil bottom-right corner, to never
			// blur or cut pixels.
			topLeft = bounds.getTopLeft().floor(),
			bottomRight = bounds.getBottomRight().ceil(),
			size = new Size(bottomRight.subtract(topLeft)),
			canvas = CanvasProvider.getCanvas(size.multiply(scale)),
			ctx = canvas.getContext('2d'),
			matrix = new Matrix().scale(scale).translate(topLeft.negate());
		ctx.save();
		matrix.applyToContext(ctx);
		// See Project#draw() for an explanation of new Base()
		this.draw(ctx, new Base({ matrices: [matrix] }));
		ctx.restore();
		var raster = new Raster(Item.NO_INSERT);
		raster.setCanvas(canvas);
		raster.transform(new Matrix().translate(topLeft.add(size.divide(2)))
				// Take resolution into account and scale back to original size.
				.scale(1 / scale));
		raster.insertAbove(this);
		// NOTE: We don't need to release the canvas since it now belongs to the
		// Raster!
		return raster;
	},

	/**
	 * Checks whether the item's geometry contains the given point.
	 *
	 * @example {@paperscript} // Click within and outside the star below
	 * // Create a star shaped path:
	 * var path = new Path.Star({
	 *	   center: [50, 50],
	 *	   points: 12,
	 *	   radius1: 20,
	 *	   radius2: 40,
	 *	   fillColor: 'black'
	 * });
	 *
	 * // Whenever the user presses the mouse:
	 * function onMouseDown(event) {
	 *	   // If the position of the mouse is within the path,
	 *	   // set its fill color to red, otherwise set it to
	 *	   // black:
	 *	   if (path.contains(event.point)) {
	 *		   path.fillColor = 'red';
	 *	   } else {
	 *		   path.fillColor = 'black';
	 *	   }
	 * }
	 *
	 * @param {Point} point The point to check for
	 */
	contains: function(/* point */) {
		// See CompoundPath#_contains() for the reason for !!
		return !!this._contains(
				this._matrix._inverseTransform(Point.read(arguments)));
	},

	_contains: function(point) {
		if (this._children) {
			for (var i = this._children.length - 1; i >= 0; i--) {
				if (this._children[i].contains(point))
					return true;
			}
			return false;
		}
		// We only implement it here for items with rectangular content,
		// for anything else we need to override #contains()
		return point.isInside(this.getInternalBounds());
	},

	// DOCS:
	// TEST:
	/**
	 * @param {Rectangle} rect the rectangle to check against
	 * @return {Boolean}
	 */
	isInside: function(/* rect */) {
		return Rectangle.read(arguments).contains(this.getBounds());
	},

	// Internal helper function, used at the moment for intersects check only.
	// TODO: Move #getIntersections() to Item, make it handle all type of items
	// through _asPathItem(), and support Group items as well, taking nested
	// matrices into account properly!
	_asPathItem: function() {
		// Creates a temporary rectangular path item with this item's bounds.
		return new Path.Rectangle({
			rectangle: this.getInternalBounds(),
			matrix: this._matrix,
			insert: false,
		});
	},

	// DOCS:
	// TEST:
	/**
	 * @param {Item} item the item to check against
	 * @return {Boolean}
	 */
	intersects: function(item, _matrix) {
		if (!(item instanceof Item))
			return false;
		// Tell getIntersections() to return as soon as some intersections are
		// found, because all we care for here is there are some or none:
		return this._asPathItem().getIntersections(item._asPathItem(), null,
				_matrix || item._matrix, true).length > 0;
	},

	/**
	 * Perform a hit-test on the item (and its children, if it is a
	 * {@link Group} or {@link Layer}) at the location of the specified point.
	 *
	 * The options object allows you to control the specifics of the hit-test
	 * and may contain a combination of the following values:
	 *
	 * @option [options.tolerance={@link PaperScope#settings}.hitTolerance]
	 * {Number} the tolerance of the hit-test
	 * @option options.class {Function} only hit-test again a certain item class
	 * and its sub-classes: {@code Group, Layer, Path, CompoundPath,
	 * Shape, Raster, PlacedSymbol, PointText}, etc
	 * @option options.fill {Boolean} hit-test the fill of items
	 * @option options.stroke {Boolean} hit-test the stroke of path items,
	 * taking into account the setting of stroke color and width
	 * @option options.segments {Boolean} hit-test for {@link Segment#point} of
	 * {@link Path} items
	 * @option options.curves {Boolean} hit-test the curves of path items,
	 * without taking the stroke color or width into account
	 * @option options.handles {Boolean} hit-test for the handles
	 * ({@link Segment#handleIn} / {@link Segment#handleOut}) of path segments
	 * @option options.ends {Boolean} only hit-test for the first or last
	 * segment points of open path items
	 * @option options.bounds {Boolean} hit-test the corners and side-centers of
	 * the bounding rectangle of items ({@link Item#bounds})
	 * @option options.center {Boolean} hit-test the {@link Rectangle#center} of
	 * the bounding rectangle of items ({@link Item#bounds})
	 * @option options.guides {Boolean} hit-test items that have
	 * {@link Item#guide} set to {@code true}
	 * @option options.selected {Boolean} only hit selected items
	 *
	 * @param {Point} point The point where the hit-test should be performed
	 * @param {Object} [options={ fill: true, stroke: true, segments: true,
	 * tolerance: 2 }]
	 * @return {HitResult} a hit result object that contains more
	 * information about what exactly was hit or {@code null} if nothing was
	 * hit
	 */
	hitTest: function(/* point, options */) {
		return this._hitTest(
				Point.read(arguments),
				HitResult.getOptions(Base.read(arguments)));
	},

	_hitTest: function(point, options) {
		if (this._locked || !this._visible || this._guide && !options.guides
				|| this.isEmpty())
			return null;

		// Check if the point is withing roughBounds + tolerance, but only if
		// this item does not have children, since we'd have to travel up the
		// chain already to determine the rough bounds.
		var matrix = this._matrix,
			parentTotalMatrix = options._totalMatrix,
			view = this.getView(),
			// Keep the accumulated matrices up to this item in options, so we
			// can keep calculating the correct _tolerancePadding values.
			totalMatrix = options._totalMatrix = parentTotalMatrix
					? parentTotalMatrix.chain(matrix)
					// If this is the first one in the recursion, factor in the
					// zoom of the view and the globalMatrix of the item.
					: this.getGlobalMatrix().preConcatenate(view._matrix),
			// Calculate the transformed padding as 2D size that describes the
			// transformed tolerance circle / ellipse. Make sure it's never 0
			// since we're using it for division.
			tolerancePadding = options._tolerancePadding = new Size(
						Path._getPenPadding(1, totalMatrix.inverted())
					).multiply(
						Math.max(options.tolerance, 1e-6)
					);
		// Transform point to local coordinates.
		point = matrix._inverseTransform(point);

		if (!this._children && !this.getInternalRoughBounds()
				.expand(tolerancePadding.multiply(2))._containsPoint(point))
			return null;
		// Filter for type, guides and selected items if that's required.
		var checkSelf = !(options.guides && !this._guide
				|| options.selected && !this._selected
				// Support legacy Item#type property to match hyphenated
				// class-names.
				|| options.type && options.type !== Base.hyphenate(this._class)
				|| options.class && !(this instanceof options.class)),
			that = this,
			res;

		function checkBounds(type, part) {
			var pt = bounds['get' + part]();
			// Since there are transformations, we cannot simply use a numerical
			// tolerance value. Instead, we divide by a padding size, see above.
			if (point.subtract(pt).divide(tolerancePadding).length <= 1)
				return new HitResult(type, that,
						{ name: Base.hyphenate(part), point: pt });
		}

		// Ignore top level layers by checking for _parent:
		if (checkSelf && (options.center || options.bounds) && this._parent) {
			// Don't get the transformed bounds, check against transformed
			// points instead
			var bounds = this.getInternalBounds();
			if (options.center)
				res = checkBounds('center', 'Center');
			if (!res && options.bounds) {
				// TODO: Move these into a private scope
				var points = [
					'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
					'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'
				];
				for (var i = 0; i < 8 && !res; i++)
					res = checkBounds('bounds', points[i]);
			}
		}

		var children = !res && this._children;
		if (children) {
			var opts = this._getChildHitTestOptions(options);
			// Loop backwards, so items that get drawn last are tested first
			for (var i = children.length - 1; i >= 0 && !res; i--)
				res = children[i]._hitTest(point, opts);
		}
		if (!res && checkSelf)
			res = this._hitTestSelf(point, options);
		// Transform the point back to the outer coordinate system.
		if (res && res.point)
			res.point = matrix.transform(res.point);
		// Restore totalMatrix for next child.
		options._totalMatrix = parentTotalMatrix;
		return res;
	},

	_getChildHitTestOptions: function(options) {
		// This is overridden in CompoundPath, for treatment of type === 'path'.
		return options;
	},

	_hitTestSelf: function(point, options) {
		// The default implementation honly handles 'fill' through #_contains()
		if (options.fill && this.hasFill() && this._contains(point))
			return new HitResult('fill', this);
	},

	/**
	 * {@grouptitle Fetching and matching items}
	 *
	 * Checks whether the item matches the criteria described by the given
	 * object, by iterating over all of its properties and matching against
	 * their values through {@link #matches(name, compare)}.
	 *
	 * See {@link Project#getItems(match)} for a selection of illustrated
	 * examples.
	 *
	 * @name Item#matches
	 * @function
	 *
	 * @param {Object|Function} match the criteria to match against
	 * @return {Boolean} {@true if the item matches all the criteria}
	 * @see #getItems(match)
	 */
	/**
	 * Checks whether the item matches the given criteria. Extended matching is
	 * possible by providing a compare function or a regular expression.
	 * Matching points, colors only work as a comparison of the full object, not
	 * partial matching (e.g. only providing the x-coordinate to match all
	 * points with that x-value). Partial matching does work for
	 * {@link Item#data}.
	 *
	 * See {@link Project#getItems(match)} for a selection of illustrated
	 * examples.
	 *
	 * @name Item#matches
	 * @function
	 *
	 * @param {String} name the name of the state to match against
	 * @param {Object} compare the value, function or regular expression to
	 * compare against
	 * @return {Boolean} {@true if the item matches the state}
	 * @see #getItems(match)
	 */
	matches: function(name, compare) {
		// matchObject() is used to match against objects in a nested manner.
		// This is useful for matching against Item#data.
		function matchObject(obj1, obj2) {
			for (var i in obj1) {
				if (obj1.hasOwnProperty(i)) {
					var val1 = obj1[i],
						val2 = obj2[i];
					if (Base.isPlainObject(val1) && Base.isPlainObject(val2)) {
						if (!matchObject(val1, val2))
							return false;
					} else if (!Base.equals(val1, val2)) {
						return false;
					}
				}
			}
			return true;
		}
		var type = typeof name;
		if (type === 'object') {
			// `name` is the match object, not a string
			for (var key in name) {
				if (name.hasOwnProperty(key) && !this.matches(key, name[key]))
					return false;
			}
		} else if (type === 'function') {
			return name(this);
		} else {
			var value = /^(empty|editable)$/.test(name)
					// Handle boolean test functions separately, by calling them
					// to get the value.
					? this['is' + Base.capitalize(name)]()
					// Support legacy Item#type property to match hyphenated
					// class-names.
					: name === 'type'
						? Base.hyphenate(this._class)
						: this[name];
			if (/^(constructor|class)$/.test(name)) {
				if (!(this instanceof compare))
					return false;
			} else if (compare instanceof RegExp) {
				if (!compare.test(value))
					return false;
			} else if (typeof compare === 'function') {
				if (!compare(value))
					return false;
			} else if (Base.isPlainObject(compare)) {
				if (!matchObject(compare, value))
					return false;
			} else if (!Base.equals(value, compare)) {
				return false;
			}
		}
		return true;
	},

	/**
	 * Fetch the descendants (children or children of children) of this item
	 * that match the properties in the specified object.
	 * Extended matching is possible by providing a compare function or
	 * regular expression. Matching points, colors only work as a comparison
	 * of the full object, not partial matching (e.g. only providing the x-
	 * coordinate to match all points with that x-value). Partial matching
	 * does work for {@link Item#data}.
	 *
	 * Matching items against a rectangular area is also possible, by setting
	 * either {@code match.inside} or {@code match.overlapping} to a rectangle
	 * describing the area in which the items either have to be fully or partly
	 * contained.
	 *
	 * See {@link Project#getItems(match)} for a selection of illustrated
	 * examples.
	 *
	 * @option match.inside {Rectangle} the rectangle in which the items need to
	 * be fully contained
	 * @option match.overlapping {Rectangle} the rectangle with which the items
	 * need to at least partly overlap
	 *
	 * @param {Object|Function} match the criteria to match against
	 * @return {Item[]} the list of matching descendant items
	 * @see #matches(match)
	 */
	getItems: function(match) {
		return Item._getItems(this._children, match, this._matrix);
	},

	/**
	 * Fetch the first descendant (child or child of child) of this item
	 * that matches the properties in the specified object.
	 * Extended matching is possible by providing a compare function or
	 * regular expression. Matching points, colors only work as a comparison
	 * of the full object, not partial matching (e.g. only providing the x-
	 * coordinate to match all points with that x-value). Partial matching
	 * does work for {@link Item#data}.
	 * See {@link Project#getItems(match)} for a selection of illustrated
	 * examples.
	 *
	 * @param {Object|Function} match the criteria to match against
	 * @return {Item} the first descendant item	 matching the given criteria
	 * @see #getItems(match)
	 */
	getItem: function(match) {
		return Item._getItems(this._children, match, this._matrix, null, true)
				[0] || null;
	},

	statics: {
		// NOTE: We pass children instead of item as first argument so the
		// method can be used for Project#layers as well in Project.
		_getItems: function _getItems(children, match, matrix, param,
				firstOnly) {
			if (!param && typeof match === 'object') {
				// Set up a couple of "side-car" values for the recursive calls
				// of _getItems below, mainly related to the handling of
				// inside / overlapping:
				var overlapping = match.overlapping,
					inside = match.inside,
					// If overlapping is set, we also perform the inside check:
					bounds = overlapping || inside,
					rect = bounds && Rectangle.read([bounds]);
				param = {
					items: [], // The list to contain the results.
					inside: !!inside,
					overlapping: !!overlapping,
					rect: rect,
					path: overlapping && new Path.Rectangle({
						rectangle: rect,
						insert: false
					})
				};
				// Create a copy of the match object that doesn't contain the
				// `inside` and `overlapping` properties.
				if (bounds)
					match = Base.set({}, match,
							{ inside: true, overlapping: true });
			}
			var items = param && param.items,
				rect = param && param.rect;
			matrix = rect && (matrix || new Matrix());
			for (var i = 0, l = children && children.length; i < l; i++) {
				var child = children[i],
					childMatrix = matrix && matrix.chain(child._matrix),
					add = true;
				if (rect) {
					var bounds = child.getBounds(childMatrix);
					// Regardless of the setting of inside / overlapping, if the
					// bounds don't even intersect, we can skip this child.
					if (!rect.intersects(bounds))
						continue;
					if (!(param.inside && rect.contains(bounds))
							&& !(param.overlapping && (bounds.contains(rect)
								|| param.path.intersects(child, childMatrix))))
						add = false;
				}
				if (add && child.matches(match)) {
					items.push(child);
					if (firstOnly)
						break;
				}
				_getItems(child._children, match,
						childMatrix, param,
						firstOnly);
				if (firstOnly && items.length > 0)
					break;
			}
			return items;
		}
	}
}, /** @lends Item# */{
	/**
	 * {@grouptitle Importing / Exporting JSON and SVG}
	 *
	 * Exports (serializes) the item with its content and child items to a JSON
	 * data string.
	 *
	 * @name Item#exportJSON
	 * @function
	 *
	 * @option [options.asString=true] {Boolean} whether the JSON is returned as a
	 * {@code Object} or a {@code String}
	 * @option [options.precision=5] {Number} the amount of fractional digits in
	 * numbers used in JSON data
	 *
	 * @param {Object} [options] the serialization options
	 * @return {String} the exported JSON data
	 */

	/**
	 * Imports (deserializes) the stored JSON data into this item. If the data
	 * describes an item of the same class or a parent class of the item, the
	 * data is imported into the item itself. If not, the imported item is added
	 * to this item's {@link Item#children} list. Note that not all type of
	 * items can have children.
	 *
	 * @param {String} json the JSON data to import from
	 */
	importJSON: function(json) {
		// Try importing into `this`. If another item is returned, try adding
		// it as a child (this won't be successful on some classes, returning
		// null).
		var res = Base.importJSON(json, this);
		return res !== this
				? this.addChild(res)
				: res;
	},

	/**
	 * Exports the item with its content and child items as an SVG DOM.
	 *
	 * @name Item#exportSVG
	 * @function
	 *
	 * @option [options.asString=false] {Boolean} whether a SVG node or a
	 * {@code String} is to be returned
	 * @option [options.precision=5] {Number} the amount of fractional digits in
	 * numbers used in SVG data
	 * @option [options.matchShapes=false] {Boolean} whether path items should
	 * tried to be converted to SVG shape items (rect, circle, ellipse, line,
	 * polyline, polygon), if their geometries match
	 * @option [options.embedImages=true] {Boolean} whether raster images
	 * should be embedded as base64 data inlined in the xlink:href attribute,
	 * or kept as a link to their external URL.
	 *
	 * @param {Object} [options] the export options
	 * @return {SVGElement} the item converted to an SVG node
	 */

	/**
	 * Converts the provided SVG content into Paper.js items and adds them to
	 * the this item's children list.
	 * Note that the item is not cleared first. You can call
	 * {@link Item#removeChildren()} to do so.
	 *
	 * @name Item#importSVG
	 * @function
	 *
	 * @option [options.expandShapes=false] {Boolean} whether imported shape
	 * items should be expanded to path items
	 * @option [options.onLoad] {Function} the callback function to call once
	 * the SVG content is loaded from the given URL. Only required when loading
	 * from external files.
	 * @option [options.applyMatrix={@link PaperScope#settings}.applyMatrix]
	 * {Boolean} whether imported items should have their transformation
	 * matrices applied to their contents or not
	 *
	 * @param {SVGElement|String} svg the SVG content to import, either as a SVG
	 * DOM node, a string containing SVG content, or a string describing the URL
	 * of the SVG file to fetch.
	 * @param {Object} [options] the import options
	 * @return {Item} the newly created Paper.js item containing the converted
	 * SVG content
	 */
	/**
	 * Imports the provided external SVG file, converts it into Paper.js items
	 * and adds them to the this item's children list.
	 * Note that the item is not cleared first. You can call
	 * {@link Item#removeChildren()} to do so.
	 *
	 * @name Item#importSVG
	 * @function
	 *
	 * @param {SVGElement|String} svg the URL of the SVG file to fetch.
	 * @param {Function} onLoad the callback function to call once the SVG
	 * content is loaded from the given URL.
	 * @return {Item} the newly created Paper.js item containing the converted
	 * SVG content
	 */

	/**
	 * {@grouptitle Hierarchy Operations}
	 * Adds the specified item as a child of this item at the end of the
	 * its children list. You can use this function for groups, compound
	 * paths and layers.
	 *
	 * @param {Item} item the item to be added as a child
	 * @return {Item} the added item, or {@code null} if adding was not
	 * possible
	 */
	addChild: function(item, _preserve) {
		return this.insertChild(undefined, item, _preserve);
	},

	/**
	 * Inserts the specified item as a child of this item at the specified
	 * index in its {@link #children} list. You can use this function for
	 * groups, compound paths and layers.
	 *
	 * @param {Number} index
	 * @param {Item} item the item to be inserted as a child
	 * @return {Item} the inserted item, or {@code null} if inserting was not
	 * possible
	 */
	insertChild: function(index, item, _preserve) {
		var res = item ? this.insertChildren(index, [item], _preserve) : null;
		return res && res[0];
	},

	/**
	 * Adds the specified items as children of this item at the end of the
	 * its children list. You can use this function for groups, compound
	 * paths and layers.
	 *
	 * @param {Item[]} items The items to be added as children
	 * @return {Item[]} the added items, or {@code null} if adding was not
	 * possible
	 */
	addChildren: function(items, _preserve) {
		return this.insertChildren(this._children.length, items, _preserve);
	},

	/**
	 * Inserts the specified items as children of this item at the specified
	 * index in its {@link #children} list. You can use this function for
	 * groups, compound paths and layers.
	 *
	 * @param {Number} index
	 * @param {Item[]} items The items to be appended as children
	 * @return {Item[]} the inserted items, or {@code null} if inserted was not
	 * possible
	 */
	insertChildren: function(index, items, _preserve, _proto) {
		// CompoundPath#insertChildren() requires _preserve and _type:
		// _preserve avoids changing of the children's path orientation
		// _proto enforces the prototype of the inserted items, as used by
		// CompoundPath#insertChildren()
		var children = this._children;
		if (children && items && items.length > 0) {
			// We need to clone items because it might be
			// an Item#children array. Also, we're removing elements if they
			// don't match _type. Use Array.prototype.slice because items can be
			// an arguments object.
			items = Array.prototype.slice.apply(items);
			// Remove the items from their parents first, since they might be
			// inserted into their own parents, affecting indices.
			// Use the loop also to filter out wrong _type.
			for (var i = items.length - 1; i >= 0; i--) {
				var item = items[i];
				if (_proto && !(item instanceof _proto)) {
					items.splice(i, 1);
				} else {
					// If the item is removed and inserted it again further
					/// above, the index needs to be adjusted accordingly.
					var shift = item._parent === this && item._index < index;
					// Notify parent of change. Don't notify item itself yet,
					// as we're doing so when adding it to the new parent below.
					if (item._remove(false, true) && shift)
						index--;
				}
			}
			Base.splice(children, items, index, 0);
			var project = this._project,
				// See #_remove() for an explanation of this:
				notifySelf = project && project._changes;
			for (var i = 0, l = items.length; i < l; i++) {
				var item = items[i];
				item._parent = this;
				item._setProject(this._project, true);
				// Setting the name again makes sure all name lookup structures
				// are kept in sync.
				if (item._name)
					item.setName(item._name);
				if (notifySelf)
					this._changed(5);
			}
			this._changed(11);
		} else {
			items = null;
		}
		return items;
	},

	// Private helper for #insertAbove() / #insertBelow()
	_insertSibling: function(index, item, _preserve) {
		return this._parent
				? this._parent.insertChild(index, item, _preserve)
				: null;
	},

	/**
	 * Inserts this item above the specified item.
	 *
	 * @param {Item} item the item above which it should be inserted
	 * @return {Item} the inserted item, or {@code null} if inserting was not
	 * possible
	 */
	insertAbove: function(item, _preserve) {
		return item._insertSibling(item._index + 1, this, _preserve);
	},

	/**
	 * Inserts this item below the specified item.
	 *
	 * @param {Item} item the item below which it should be inserted
	 * @return {Item} the inserted item, or {@code null} if inserting was not
	 * possible
	 */
	insertBelow: function(item, _preserve) {
		return item._insertSibling(item._index, this, _preserve);
	},

	/**
	 * Sends this item to the back of all other items within the same parent.
	 */
	sendToBack: function() {
		// If there is no parent and the item is a layer, delegate to project
		// instead.
		return (this._parent || this instanceof Layer && this._project)
				.insertChild(0, this);
	},

	/**
	 * Brings this item to the front of all other items within the same parent.
	 */
	bringToFront: function() {
		// If there is no parent and the item is a layer, delegate to project
		// instead.
		return (this._parent || this instanceof Layer && this._project)
				.addChild(this);
	},

	/**
	 * Inserts the specified item as a child of this item by appending it to
	 * the list of children and moving it above all other children. You can
	 * use this function for groups, compound paths and layers.
	 *
	 * @function
	 * @param {Item} item The item to be appended as a child
	 * @deprecated use {@link #addChild(item)} instead.
	 */
	appendTop: '#addChild',

	/**
	 * Inserts the specified item as a child of this item by appending it to
	 * the list of children and moving it below all other children. You can
	 * use this function for groups, compound paths and layers.
	 *
	 * @param {Item} item The item to be appended as a child
	 * @deprecated use {@link #insertChild(index, item)} instead.
	 */
	appendBottom: function(item) {
		return this.insertChild(0, item);
	},

	/**
	 * Moves this item above the specified item.
	 *
	 * @function
	 * @param {Item} item The item above which it should be moved
	 * @return {Boolean} {@true if it was moved}
	 * @deprecated use {@link #insertAbove(item)} instead.
	 */
	moveAbove: '#insertAbove',

	/**
	 * Moves the item below the specified item.
	 *
	 * @function
	 * @param {Item} item the item below which it should be moved
	 * @return {Boolean} {@true if it was moved}
	 * @deprecated use {@link #insertBelow(item)} instead.
	 */
	moveBelow: '#insertBelow',

	/**
	 * If this is a group, layer or compound-path with only one child-item,
	 * the child-item is moved outside and the parent is erased. Otherwise, the
	 * item itself is returned unmodified.
	 *
	 * @return {Item} the reduced item
	 */
	reduce: function() {
		if (this._children && this._children.length === 1) {
			var child = this._children[0].reduce();
			child.insertAbove(this);
			child.setStyle(this._style);
			this.remove();
			return child;
		}
		return this;
	},

	/**
	 * Removes the item from its parent's named children list.
	 */
	_removeNamed: function() {
		var parent = this._parent;
		if (parent) {
			var children = parent._children,
				namedChildren = parent._namedChildren,
				name = this._name,
				namedArray = namedChildren[name],
				index = namedArray ? namedArray.indexOf(this) : -1;
			if (index !== -1) {
				// Remove the named reference
				if (children[name] == this)
					delete children[name];
				// Remove this entry
				namedArray.splice(index, 1);
				// If there are any items left in the named array, set
				// the last of them to be this.parent.children[this.name]
				if (namedArray.length) {
					children[name] = namedArray[namedArray.length - 1];
				} else {
					// Otherwise delete the empty array
					delete namedChildren[name];
				}
			}
		}
	},

	/**
	 * Removes the item from its parent's children list.
	 */
	_remove: function(notifySelf, notifyParent) {
		var parent = this._parent;
		if (parent) {
			if (this._name)
				this._removeNamed();
			if (this._index != null)
				Base.splice(parent._children, null, this._index, 1);
			this._installEvents(false);
			// Notify self of the insertion change. We only need this
			// notification if we're tracking changes for now.
			if (notifySelf) {
				var project = this._project;
				if (project && project._changes)
					this._changed(5);
			}
			// Notify parent of changed children
			if (notifyParent)
				parent._changed(11);
			this._parent = null;
			return true;
		}
		return false;
	},

	/**
	 * Removes the item and all its children from the project. The item is not
	 * destroyed and can be inserted again after removal.
	 *
	 * @return {Boolean} {@true if the item was removed}
	 */
	remove: function() {
		// Notify self and parent of change:
		return this._remove(true, true);
	},

	/**
	 * Replaces this item with the provided new item which will takes its place
	 * in the project hierarchy instead.
	 *
	 * @return {Boolean} {@true if the item was replaced}
	 */
	replaceWith: function(item) {
		var ok = item && item.insertBelow(this);
		if (ok)
			this.remove();
		return ok;
	},

	/**
	 * Removes all of the item's {@link #children} (if any).
	 *
	 * @name Item#removeChildren
	 * @alias Item#clear
	 * @function
	 * @return {Item[]} an array containing the removed items
	 */
	/**
	 * Removes the children from the specified {@code from} index to the
	 * {@code to} index from the parent's {@link #children} array.
	 *
	 * @name Item#removeChildren
	 * @function
	 * @param {Number} from the beginning index, inclusive
	 * @param {Number} [to=children.length] the ending index, exclusive
	 * @return {Item[]} an array containing the removed items
	 */
	removeChildren: function(from, to) {
		if (!this._children)
			return null;
		from = from || 0;
		to = Base.pick(to, this._children.length);
		// Use Base.splice(), which adjusts #_index for the items above, and
		// deletes it for the removed items. Calling #_remove() afterwards is
		// fine, since it only calls Base.splice() if #_index is set.
		var removed = Base.splice(this._children, null, from, to - from);
		for (var i = removed.length - 1; i >= 0; i--) {
			// Don't notify parent each time, notify it separately after.
			removed[i]._remove(true, false);
		}
		if (removed.length > 0)
			this._changed(11);
		return removed;
	},

	// DOCS Item#clear()
	clear: '#removeChildren',

	/**
	 * Reverses the order of the item's children
	 */
	reverseChildren: function() {
		if (this._children) {
			this._children.reverse();
			// Adjust indices
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i]._index = i;
			this._changed(11);
		}
	},

	/**
	 * {@grouptitle Tests}
	 * Specifies whether the item has any content or not. The meaning of what
	 * content is differs from type to type. For example, a {@link Group} with
	 * no children, a {@link TextItem} with no text content and a {@link Path}
	 * with no segments all are considered empty.
	 *
	 * @return Boolean
	 */
	isEmpty: function() {
		return !this._children || this._children.length === 0;
	},

	/**
	 * Checks whether the item is editable.
	 *
	 * @return {Boolean} {@true when neither the item, nor its parents are
	 * locked or hidden}
	 * @ignore
	 */
	// TODO: Item#isEditable is currently ignored in the documentation, as
	// locking an item currently has no effect
	isEditable: function() {
		var item = this;
		while (item) {
			if (!item._visible || item._locked)
				return false;
			item = item._parent;
		}
		return true;
	},

	/**
	 * Checks whether the item is valid, i.e. it hasn't been removed.
	 *
	 * @return {Boolean} {@true if the item is valid}
	 */
	// TODO: isValid / checkValid

	/**
	 * {@grouptitle Style Tests}
	 *
	 * Checks whether the item has a fill.
	 *
	 * @return {Boolean} {@true if the item has a fill}
	 */
	hasFill: function() {
		return this.getStyle().hasFill();
	},

	/**
	 * Checks whether the item has a stroke.
	 *
	 * @return {Boolean} {@true if the item has a stroke}
	 */
	hasStroke: function() {
		return this.getStyle().hasStroke();
	},

	/**
	 * Checks whether the item has a shadow.
	 *
	 * @return {Boolean} {@true if the item has a shadow}
	 */
	hasShadow: function() {
		return this.getStyle().hasShadow();
	},

	/**
	 * Returns -1 if 'this' is above 'item', 1 if below, 0 if their order is not
	 * defined in such a way, e.g. if one is a descendant of the other.
	 */
	_getOrder: function(item) {
		// Private method that produces a list of anchestors, starting with the
		// root and ending with the actual element as the last entry.
		function getList(item) {
			var list = [];
			do {
				list.unshift(item);
			} while (item = item._parent);
			return list;
		}
		var list1 = getList(this),
			list2 = getList(item);
		for (var i = 0, l = Math.min(list1.length, list2.length); i < l; i++) {
			if (list1[i] != list2[i]) {
				// Found the position in the parents list where the two start
				// to differ. Look at who's above who.
				return list1[i]._index < list2[i]._index ? 1 : -1;
			}
		}
		return 0;
	},

	/**
	 * {@grouptitle Hierarchy Tests}
	 *
	 * Checks if the item contains any children items.
	 *
	 * @return {Boolean} {@true it has one or more children}
	 */
	hasChildren: function() {
		return this._children && this._children.length > 0;
	},

	/**
	 * Checks whether the item and all its parents are inserted into the DOM or
	 * not.
	 *
	 * @return {Boolean} {@true if the item is inserted into the DOM}
	 */
	isInserted: function() {
		return this._parent ? this._parent.isInserted() : false;
	},

	/**
	 * Checks if this item is above the specified item in the stacking order
	 * of the project.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is above the specified item}
	 */
	isAbove: function(item) {
		return this._getOrder(item) === -1;
	},

	/**
	 * Checks if the item is below the specified item in the stacking order of
	 * the project.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is below the specified item}
	 */
	isBelow: function(item) {
		return this._getOrder(item) === 1;
	},

	/**
	 * Checks whether the specified item is the parent of the item.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is the parent of the item}
	 */
	isParent: function(item) {
		return this._parent === item;
	},

	/**
	 * Checks whether the specified item is a child of the item.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true it is a child of the item}
	 */
	isChild: function(item) {
		return item && item._parent === this;
	},

	/**
	 * Checks if the item is contained within the specified item.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is inside the specified item}
	 */
	isDescendant: function(item) {
		var parent = this;
		while (parent = parent._parent) {
			if (parent == item)
				return true;
		}
		return false;
	},

	/**
	 * Checks if the item is an ancestor of the specified item.
	 *
	 * @param {Item} item the item to check against
	 * @return {Boolean} {@true if the item is an ancestor of the specified
	 * item}
	 */
	isAncestor: function(item) {
		return item ? item.isDescendant(this) : false;
	},

	/**
	 * Checks if the item is an a sibling of the specified item.
	 *
	 * @param {Item} item the item to check against
	 * @return {Boolean} {@true if the item is aa sibling of the specified item}
	 */
	isSibling: function(item) {
		return this._parent === item._parent;
	},

	/**
	 * Checks whether the item is grouped with the specified item.
	 *
	 * @param {Item} item
	 * @return {Boolean} {@true if the items are grouped together}
	 */
	isGroupedWith: function(item) {
		var parent = this._parent;
		while (parent) {
			// Find group parents. Check for parent._parent, since don't want
			// top level layers, because they also inherit from Group
			if (parent._parent
				&& /^(Group|Layer|CompoundPath)$/.test(parent._class)
				&& item.isDescendant(parent))
					return true;
			// Keep walking up otherwise
			parent = parent._parent;
		}
		return false;
	},

	// Document all style properties which get injected into Item by Style:

	/**
	 * {@grouptitle Stroke Style}
	 *
	 * The color of the stroke.
	 *
	 * @name Item#strokeColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the stroke color of a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35
	 * });
	 *
	 * // Set its stroke color to RGB red:
	 * circle.strokeColor = new Color(1, 0, 0);
	 */

	/**
	 * The width of the stroke.
	 *
	 * @name Item#strokeWidth
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Setting an item's stroke width:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35,
	 *	   strokeColor: 'red'
	 * });
	 *
	 * // Set its stroke width to 10:
	 * circle.strokeWidth = 10;
	 */

	/**
	 * The shape to be used at the beginning and end of open {@link Path} items,
	 * when they have a stroke.
	 *
	 * @name Item#strokeCap
	 * @property
	 * @default 'butt'
	 * @type String('round', 'square', 'butt')
	 *
	 * @example {@paperscript height=200}
	 * // A look at the different stroke caps:
	 *
	 * var line = new Path({
	 *	   segments: [[80, 50], [420, 50]],
	 *	   strokeColor: 'black',
	 *	   strokeWidth: 20,
	 *	   selected: true
	 * });
	 *
	 * // Set the stroke cap of the line to be round:
	 * line.strokeCap = 'round';
	 *
	 * // Copy the path and set its stroke cap to be square:
	 * var line2 = line.clone();
	 * line2.position.y += 50;
	 * line2.strokeCap = 'square';
	 *
	 * // Make another copy and set its stroke cap to be butt:
	 * var line2 = line.clone();
	 * line2.position.y += 100;
	 * line2.strokeCap = 'butt';
	 */

	/**
	 * The shape to be used at the segments and corners of {@link Path} items
	 * when they have a stroke.
	 *
	 * @name Item#strokeJoin
	 * @property
	 * @default 'miter'
	 * @type String('miter', 'round', 'bevel')
	 *
	 *
	 * @example {@paperscript height=120}
	 * // A look at the different stroke joins:
	 * var path = new Path({
	 *	   segments: [[80, 100], [120, 40], [160, 100]],
	 *	   strokeColor: 'black',
	 *	   strokeWidth: 20,
	 *	   // Select the path, in order to see where the stroke is formed:
	 *	   selected: true
	 * });
	 *
	 * var path2 = path.clone();
	 * path2.position.x += path2.bounds.width * 1.5;
	 * path2.strokeJoin = 'round';
	 *
	 * var path3 = path2.clone();
	 * path3.position.x += path3.bounds.width * 1.5;
	 * path3.strokeJoin = 'bevel';
	 */

	/**
	 * The dash offset of the stroke.
	 *
	 * @name Item#dashOffset
	 * @property
	 * @default 0
	 * @type Number
	 */

	/**
	 * Specifies whether the stroke is to be drawn taking the current affine
	 * transformation into account (the default behavior), or whether it should
	 * appear as a non-scaling stroke.
	 *
	 * @name Item#strokeScaling
	 * @property
	 * @default true
	 * @type Boolean
	 */

	/**
	 * Specifies an array containing the dash and gap lengths of the stroke.
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 40,
	 *	   strokeWidth: 2,
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Set the dashed stroke to [10pt dash, 4pt gap]:
	 * path.dashArray = [10, 4];
	 *
	 * @name Item#dashArray
	 * @property
	 * @default []
	 * @type Array
	 */

	/**
	 * The miter limit of the stroke.
	 * When two line segments meet at a sharp angle and miter joins have been
	 * specified for {@link Item#strokeJoin}, it is possible for the miter to
	 * extend far beyond the {@link Item#strokeWidth} of the path. The
	 * miterLimit imposes a limit on the ratio of the miter length to the
	 * {@link Item#strokeWidth}.
	 *
	 * @property
	 * @name Item#miterLimit
	 * @default 10
	 * @type Number
	 */

	/**
	 * The winding-rule with which the shape gets filled. Please note that only
	 * modern browsers support winding-rules other than {@code 'nonzero'}.
	 *
	 * @property
	 * @name Item#windingRule
	 * @default 'nonzero'
	 * @type String('nonzero', 'evenodd')
	 */

	/**
	 * {@grouptitle Fill Style}
	 *
	 * The fill color of the item.
	 *
	 * @name Item#fillColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the fill color of a path to red:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35
	 * });
	 *
	 * // Set the fill color of the circle to RGB red:
	 * circle.fillColor = new Color(1, 0, 0);
	 */

	// TODO: Find a better name than selectedColor. It should also be used for
	// guides, etc.
	/**
	 * {@grouptitle Selection Style}
	 *
	 * The color the item is highlighted with when selected. If the item does
	 * not specify its own color, the color defined by its layer is used instead.
	 *
	 * @name Item#selectedColor
	 * @property
	 * @type Color
	 */

	/**
	 * {@grouptitle Transform Functions}
	 *
	 * Translates (moves) the item by the given offset point.
	 *
	 * @param {Point} delta the offset to translate the item by
	 */
	translate: function(/* delta */) {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments));
	},

	/**
	 * Rotates the item by a given angle around the given point.
	 *
	 * Angles are oriented clockwise and measured in degrees.
	 *
	 * @param {Number} angle the rotation angle
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#rotate
	 *
	 * @example {@paperscript}
	 * // Rotating an item:
	 *
	 * // Create a rectangle shaped path with its top left
	 * // point at {x: 80, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(80, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * // Rotate the path by 30 degrees:
	 * path.rotate(30);
	 *
	 * @example {@paperscript height=200}
	 * // Rotating an item around a specific point:
	 *
	 * // Create a rectangle shaped path with its top left
	 * // point at {x: 175, y: 50} and a size of {width: 100, height: 100}:
	 * var topLeft = new Point(175, 50);
	 * var size = new Size(100, 100);
	 * var path = new Path.Rectangle(topLeft, size);
	 * path.fillColor = 'black';
	 *
	 * // Draw a circle shaped path in the center of the view,
	 * // to show the rotation point:
	 * var circle = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 5,
	 *	   fillColor: 'white'
	 * });
	 *
	 * // Each frame rotate the path 3 degrees around the center point
	 * // of the view:
	 * function onFrame(event) {
	 *	   path.rotate(3, view.center);
	 * }
	 */
	rotate: function(angle /*, center */) {
		return this.transform(new Matrix().rotate(angle,
				Point.read(arguments, 1, { readNull: true })
					|| this.getPosition(true)));
	}
}, Base.each(['scale', 'shear', 'skew'], function(name) {
	this[name] = function() {
		// See Matrix#scale for explanation of this:
		var point = Point.read(arguments),
			center = Point.read(arguments, 0, { readNull: true });
		return this.transform(new Matrix()[name](point,
				center || this.getPosition(true)));
	};
}, /** @lends Item# */{
	/**
	 * Scales the item by the given value from its center point, or optionally
	 * from a supplied point.
	 *
	 * @name Item#scale
	 * @function
	 * @param {Number} scale the scale factor
	 * @param {Point} [center={@link Item#position}]
	 *
	 * @example {@paperscript}
	 * // Scaling an item from its center point:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 20,
	 *	   fillColor: 'red'
	 * });
	 *
	 * // Scale the path by 150% from its center point
	 * circle.scale(1.5);
	 *
	 * @example {@paperscript}
	 * // Scaling an item from a specific point:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 20,
	 *	   fillColor: 'red'
	 * });
	 *
	 * // Scale the path 150% from its bottom left corner
	 * circle.scale(1.5, circle.bounds.bottomLeft);
	 */
	/**
	 * Scales the item by the given values from its center point, or optionally
	 * from a supplied point.
	 *
	 * @name Item#scale
	 * @function
	 * @param {Number} hor the horizontal scale factor
	 * @param {Number} ver the vertical scale factor
	 * @param {Point} [center={@link Item#position}]
	 *
	 * @example {@paperscript}
	 * // Scaling an item horizontally by 300%:
	 *
	 * // Create a circle shaped path at { x: 100, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle({
	 *	   center: [100, 50],
	 *	   radius: 20,
	 *	   fillColor: 'red'
	 * });
	 *
	 * // Scale the path horizontally by 300%
	 * circle.scale(3, 1);
	 */

	// TODO: Add test for item shearing, as it might be behaving oddly.
	/**
	 * Shears the item by the given value from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#shear
	 * @function
	 * @param {Point} shear the horziontal and vertical shear factors as a point
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#shear
	 */
	/**
	 * Shears the item by the given values from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#shear
	 * @function
	 * @param {Number} hor the horizontal shear factor
	 * @param {Number} ver the vertical shear factor
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#shear
	 */

	/**
	 * Skews the item by the given angles from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#skew
	 * @function
	 * @param {Point} skew	the horziontal and vertical skew angles in degrees
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#shear
	 */
	/**
	 * Skews the item by the given angles from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#skew
	 * @function
	 * @param {Number} hor the horizontal skew angle in degrees
	 * @param {Number} ver the vertical sskew angle in degrees
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#shear
	 */
}), /** @lends Item# */{
	/**
	 * Transform the item.
	 *
	 * @param {Matrix} matrix the matrix by which the item shall be transformed
	 */
	// TODO: Implement flags:
	// @param {String[]} flags Array of any of the following: 'objects',
	//		  'children', 'fill-gradients', 'fill-patterns', 'stroke-patterns',
	//		  'lines'. Default: ['objects', 'children']
	transform: function(matrix, _applyMatrix, _applyRecursively,
			_setApplyMatrix) {
		// If no matrix is provided, or the matrix is the identity, we might
		// still have some work to do in case _applyMatrix is true
		if (matrix && matrix.isIdentity())
			matrix = null;
		var _matrix = this._matrix,
			applyMatrix = (_applyMatrix || this._applyMatrix)
					// Don't apply _matrix if the result of concatenating with
					// matrix would be identity.
					&& ((!_matrix.isIdentity() || matrix)
						// Even if it's an identity matrix, we still need to
						// recursively apply the matrix to children.
						|| _applyMatrix && _applyRecursively && this._children);
		// Bail out if there is nothing to do.
		if (!matrix && !applyMatrix)
			return this;
		// Simply preconcatenate the internal matrix with the passed one:
		if (matrix)
			_matrix.preConcatenate(matrix);
		// Call #_transformContent() now, if we need to directly apply the
		// internal _matrix transformations to the item's content.
		// Application is not possible on Raster, PointText, PlacedSymbol, since
		// the matrix is where the actual transformation state is stored.
		if (applyMatrix = applyMatrix && this._transformContent(_matrix,
					_applyRecursively, _setApplyMatrix)) {
			// When the _matrix could be applied, we also need to transform
			// color styles (only gradients so far) and pivot point:
			var pivot = this._pivot,
				style = this._style,
				// pass true for _dontMerge so we don't recursively transform
				// styles on groups' children.
				fillColor = style.getFillColor(true),
				strokeColor = style.getStrokeColor(true);
			if (pivot)
				_matrix._transformPoint(pivot, pivot, true);
			if (fillColor)
				fillColor.transform(_matrix);
			if (strokeColor)
				strokeColor.transform(_matrix);
			// Reset the internal matrix to the identity transformation if it
			// was possible to apply it.
			_matrix.reset(true);
			// Set the internal _applyMatrix flag to true if we're told to do so
			if (_setApplyMatrix && this._canApplyMatrix)
				this._applyMatrix = true;
		}
		// Calling _changed will clear _bounds and _position, but depending
		// on matrix we can calculate and set them again, so preserve them.
		var bounds = this._bounds,
			position = this._position;
		// We always need to call _changed since we're caching bounds on all
		// items, including Group.
		this._changed(9);
		// Detect matrices that contain only translations and scaling
		// and transform the cached _bounds and _position without having to
		// fully recalculate each time.
		var decomp = bounds && matrix && matrix.decompose();
		if (decomp && !decomp.shearing && decomp.rotation % 90 === 0) {
			// Transform the old bound by looping through all the cached bounds
			// in _bounds and transform each.
			for (var key in bounds) {
				var rect = bounds[key];
				// If these are internal bounds, only transform them if this
				// item applied its matrix.
				if (applyMatrix || !rect._internal)
					matrix._transformBounds(rect, rect);
			}
			// If we have cached bounds, update _position again as its
			// center. We need to take into account _boundsGetter here too, in
			// case another getter is assigned to it, e.g. 'getStrokeBounds'.
			var getter = this._boundsGetter,
				rect = bounds[getter && getter.getBounds || getter || 'getBounds'];
			if (rect)
				this._position = rect.getCenter(true);
			this._bounds = bounds;
		} else if (matrix && position) {
			// Transform position as well.
			this._position = matrix._transformPoint(position, position);
		}
		// Allow chaining here, since transform() is related to Matrix functions
		return this;
	},

	_transformContent: function(matrix, applyRecursively, setApplyMatrix) {
		var children = this._children;
		if (children) {
			for (var i = 0, l = children.length; i < l; i++)
				children[i].transform(matrix, true, applyRecursively,
						setApplyMatrix);
			return true;
		}
	},

	/**
	 * Converts the specified point from global project coordinate space to the
	 * item's own local coordinate space.
	 *
	 * @param {Point} point the point to be transformed
	 * @return {Point} the transformed point as a new instance
	 */
	globalToLocal: function(/* point */) {
		return this.getGlobalMatrix(true)._inverseTransform(
				Point.read(arguments));
	},

	/**
	 * Converts the specified point from the item's own local coordinate space
	 * to the global project coordinate space.
	 *
	 * @param {Point} point the point to be transformed
	 * @return {Point} the transformed point as a new instance
	 */
	localToGlobal: function(/* point */) {
		return this.getGlobalMatrix(true)._transformPoint(
				Point.read(arguments));
	},

	/**
	 * Converts the specified point from the parent's coordinate space to
	 * item's own local coordinate space.
	 *
	 * @param {Point} point the point to be transformed
	 * @return {Point} the transformed point as a new instance
	 */
	parentToLocal: function(/* point */) {
		return this._matrix._inverseTransform(Point.read(arguments));
	},

	/**
	 * Converts the specified point from the item's own local coordinate space
	 * to the parent's coordinate space.
	 *
	 * @param {Point} point the point to be transformed
	 * @return {Point} the transformed point as a new instance
	 */
	localToParent: function(/* point */) {
		return this._matrix._transformPoint(Point.read(arguments));
	},

	/**
	 * Transform the item so that its {@link #bounds} fit within the specified
	 * rectangle, without changing its aspect ratio.
	 *
	 * @param {Rectangle} rectangle
	 * @param {Boolean} [fill=false]
	 *
	 * @example {@paperscript height=100}
	 * // Fitting an item to the bounding rectangle of another item's bounding
	 * // rectangle:
	 *
	 * // Create a rectangle shaped path with its top left corner
	 * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
	 * var path = new Path.Rectangle({
	 *	   point: [80, 25],
	 *	   size: [75, 50],
	 *	   fillColor: 'black'
	 * });
	 *
	 * // Create a circle shaped path with its center at {x: 80, y: 50}
	 * // and a radius of 30.
	 * var circlePath = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 30,
	 *	   fillColor: 'red'
	 * });
	 *
	 * // Fit the circlePath to the bounding rectangle of
	 * // the rectangular path:
	 * circlePath.fitBounds(path.bounds);
	 *
	 * @example {@paperscript height=100}
	 * // Fitting an item to the bounding rectangle of another item's bounding
	 * // rectangle with the fill parameter set to true:
	 *
	 * // Create a rectangle shaped path with its top left corner
	 * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
	 * var path = new Path.Rectangle({
	 *	   point: [80, 25],
	 *	   size: [75, 50],
	 *	   fillColor: 'black'
	 * });
	 *
	 * // Create a circle shaped path with its center at {x: 80, y: 50}
	 * // and a radius of 30.
	 * var circlePath = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 30,
	 *	   fillColor: 'red'
	 * });
	 *
	 * // Fit the circlePath to the bounding rectangle of
	 * // the rectangular path:
	 * circlePath.fitBounds(path.bounds, true);
	 *
	 * @example {@paperscript height=200}
	 * // Fitting an item to the bounding rectangle of the view
	 * var path = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 30,
	 *	   fillColor: 'red'
	 * });
	 *
	 * // Fit the path to the bounding rectangle of the view:
	 * path.fitBounds(view.bounds);
	 */
	fitBounds: function(rectangle, fill) {
		// TODO: Think about passing options with various ways of defining
		// fitting.
		rectangle = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			itemRatio = bounds.height / bounds.width,
			rectRatio = rectangle.height / rectangle.width,
			scale = (fill ? itemRatio > rectRatio : itemRatio < rectRatio)
					? rectangle.width / bounds.width
					: rectangle.height / bounds.height,
			newBounds = new Rectangle(new Point(),
					new Size(bounds.width * scale, bounds.height * scale));
		newBounds.setCenter(rectangle.getCenter());
		this.setBounds(newBounds);
	},

	/**
	 * {@grouptitle Event Handlers}
	 * Item level handler function to be called on each frame of an animation.
	 * The function receives an event object which contains information about
	 * the frame event:
	 *
	 * @option event.count {Number} the number of times the frame event was
	 * fired
	 * @option event.time {Number} the total amount of time passed since the
	 * first frame event in seconds
	 * @option event.delta {Number} the time passed in seconds since the last
	 * frame event
	 *
	 * @see View#onFrame
	 * @example {@paperscript}
	 * // Creating an animation:
	 *
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * path.onFrame = function(event) {
	 *	   // Every frame, rotate the path by 3 degrees:
	 *	   this.rotate(3);
	 * }
	 *
	 * @name Item#onFrame
	 * @property
	 * @type Function
	 */

	/**
	 * The function to be called when the mouse button is pushed down on the
	 * item. The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseDown
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Press the mouse button down on the circle shaped path, to make it red:
	 *
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * // When the mouse is pressed on the item,
	 * // set its fill color to red:
	 * path.onMouseDown = function(event) {
	 *	   this.fillColor = 'red';
	 * }
	 *
	 * @example {@paperscript}
	 * // Press the mouse on the circle shaped paths to remove them:
	 *
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 *	   // Create a circle shaped path at a random position
	 *	   // in the view:
	 *	   var path = new Path.Circle({
	 *		   center: Point.random() * view.size,
	 *		   radius: 25,
	 *		   fillColor: 'black',
	 *		   strokeColor: 'white'
	 *	   });
	 *
	 *	   // When the mouse is pressed on the item, remove it:
	 *	   path.onMouseDown = function(event) {
	 *		   this.remove();
	 *	   }
	 * }
	 */

	/**
	 * The function to be called when the mouse button is released over the item.
	 * The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseUp
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Release the mouse button over the circle shaped path, to make it red:
	 *
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * // When the mouse is released over the item,
	 * // set its fill color to red:
	 * path.onMouseUp = function(event) {
	 *	   this.fillColor = 'red';
	 * }
	 */

	/**
	 * The function to be called when the mouse clicks on the item. The function
	 * receives a {@link MouseEvent} object which contains information about the
	 * mouse event.
	 *
	 * @name Item#onClick
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Click on the circle shaped path, to make it red:
	 *
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * // When the mouse is clicked on the item,
	 * // set its fill color to red:
	 * path.onClick = function(event) {
	 *	   this.fillColor = 'red';
	 * }
	 *
	 * @example {@paperscript}
	 * // Click on the circle shaped paths to remove them:
	 *
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 *	   // Create a circle shaped path at a random position
	 *	   // in the view:
	 *	   var path = new Path.Circle({
	 *		   center: Point.random() * view.size,
	 *		   radius: 25,
	 *		   fillColor: 'black',
	 *		   strokeColor: 'white'
	 *	   });
	 *
	 *	   // When the mouse clicks on the item, remove it:
	 *	   path.onClick = function(event) {
	 *		   this.remove();
	 *	   }
	 * }
	 */

	/**
	 * The function to be called when the mouse double clicks on the item. The
	 * function receives a {@link MouseEvent} object which contains information
	 * about the mouse event.
	 *
	 * @name Item#onDoubleClick
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Double click on the circle shaped path, to make it red:
	 *
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * // When the mouse is double clicked on the item,
	 * // set its fill color to red:
	 * path.onDoubleClick = function(event) {
	 *	   this.fillColor = 'red';
	 * }
	 *
	 * @example {@paperscript}
	 * // Double click on the circle shaped paths to remove them:
	 *
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 *	   // Create a circle shaped path at a random position
	 *	   // in the view:
	 *	   var path = new Path.Circle({
	 *		   center: Point.random() * view.size,
	 *		   radius: 25,
	 *		   fillColor: 'black',
	 *		   strokeColor: 'white'
	 *	   });
	 *
	 *	   // When the mouse is double clicked on the item, remove it:
	 *	   path.onDoubleClick = function(event) {
	 *		   this.remove();
	 *	   }
	 * }
	 */

	/**
	 * The function to be called repeatedly when the mouse moves on top of the
	 * item. The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseMove
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Move over the circle shaped path, to change its opacity:
	 *
	 * // Create a circle shaped path at the center of the view:
	 *	   var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 *	   });
	 *
	 * // When the mouse moves on top of the item, set its opacity
	 * // to a random value between 0 and 1:
	 * path.onMouseMove = function(event) {
	 *	   this.opacity = Math.random();
	 * }
	 */

	/**
	 * The function to be called when the mouse moves over the item. This
	 * function will only be called again, once the mouse moved outside of the
	 * item first. The function receives a {@link MouseEvent} object which
	 * contains information about the mouse event.
	 *
	 * @name Item#onMouseEnter
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // When you move the mouse over the item, its fill color is set to red.
	 * // When you move the mouse outside again, its fill color is set back
	 * // to black.
	 *
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * // When the mouse enters the item, set its fill color to red:
	 * path.onMouseEnter = function(event) {
	 *	   this.fillColor = 'red';
	 * }
	 *
	 * // When the mouse leaves the item, set its fill color to black:
	 * path.onMouseLeave = function(event) {
	 *	   this.fillColor = 'black';
	 * }
	 * @example {@paperscript}
	 * // When you click the mouse, you create new circle shaped items. When you
	 * // move the mouse over the item, its fill color is set to red. When you
	 * // move the mouse outside again, its fill color is set back
	 * // to black.
	 *
	 * function enter(event) {
	 *	   this.fillColor = 'red';
	 * }
	 *
	 * function leave(event) {
	 *	   this.fillColor = 'black';
	 * }
	 *
	 * // When the mouse is pressed:
	 * function onMouseDown(event) {
	 *	   // Create a circle shaped path at the position of the mouse:
	 *	   var path = new Path.Circle(event.point, 25);
	 *	   path.fillColor = 'black';
	 *
	 *	   // When the mouse enters the item, set its fill color to red:
	 *	   path.onMouseEnter = enter;
	 *
	 *	   // When the mouse leaves the item, set its fill color to black:
	 *	   path.onMouseLeave = leave;
	 * }
	 */

	/**
	 * The function to be called when the mouse moves out of the item.
	 * The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseLeave
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Move the mouse over the circle shaped path and then move it out
	 * // of it again to set its fill color to red:
	 *
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * // When the mouse leaves the item, set its fill color to red:
	 * path.onMouseLeave = function(event) {
	 *	   this.fillColor = 'red';
	 * }
	 */

	/**
	 * {@grouptitle Event Handling}
	 *
	 * Attaches an event handler to the item.
	 *
	 * @name Item#on
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Function} function The function to be called when the event
	 * occurs
	 * @return {Item} this item itself, so calls can be chained
	 *
	 * @example {@paperscript}
	 * // Change the fill color of the path to red when the mouse enters its
	 * // shape and back to black again, when it leaves its shape.
	 *
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 25,
	 *	   fillColor: 'black'
	 * });
	 *
	 * // When the mouse enters the item, set its fill color to red:
	 * path.on('mouseenter', function() {
	 *	   this.fillColor = 'red';
	 * });
	 *
	 * // When the mouse leaves the item, set its fill color to black:
	 * path.on('mouseleave', function() {
	 *	   this.fillColor = 'black';
	 * });
	 */
	/**
	 * Attaches one or more event handlers to the item.
	 *
	 * @name Item#on
	 * @function
	 * @param {Object} object an object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, click,
	 * doubleclick, mousemove, mouseenter, mouseleave}
	 * @return {Item} this item itself, so calls can be chained
	 *
	 * @example {@paperscript}
	 * // Change the fill color of the path to red when the mouse enters its
	 * // shape and back to black again, when it leaves its shape.
	 *
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 25
	 * });
	 * path.fillColor = 'black';
	 *
	 * // When the mouse enters the item, set its fill color to red:
	 * path.on({
	 *	   mouseenter: function(event) {
	 *		   this.fillColor = 'red';
	 *	   },
	 *	   mouseleave: function(event) {
	 *		   this.fillColor = 'black';
	 *	   }
	 * });
	 * @example {@paperscript}
	 * // When you click the mouse, you create new circle shaped items. When you
	 * // move the mouse over the item, its fill color is set to red. When you
	 * // move the mouse outside again, its fill color is set black.
	 *
	 * var pathHandlers = {
	 *	   mouseenter: function(event) {
	 *		   this.fillColor = 'red';
	 *	   },
	 *	   mouseleave: function(event) {
	 *		   this.fillColor = 'black';
	 *	   }
	 * }
	 *
	 * // When the mouse is pressed:
	 * function onMouseDown(event) {
	 *	   // Create a circle shaped path at the position of the mouse:
	 *	   var path = new Path.Circle({
	 *		   center: event.point,
	 *		   radius: 25,
	 *		   fillColor: 'black'
	 *	   });
	 *
	 *	   // Attach the handers inside the object literal to the path:
	 *	   path.on(pathHandlers);
	 * }
	 */

	/**
	 * Detach an event handler from the item.
	 *
	 * @name Item#off
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Function} function The function to be detached
	 * @return {Item} this item itself, so calls can be chained
	 */
	/**
	 * Detach one or more event handlers to the item.
	 *
	 * @name Item#off
	 * @function
	 * @param {Object} object an object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, click,
	 * doubleclick, mousemove, mouseenter, mouseleave}
	 * @return {Item} this item itself, so calls can be chained
	 */

	/**
	 * Emit an event on the item.
	 *
	 * @name Item#emit
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Object} event an object literal containing properties describing
	 * the event
	 * @return {Boolean} {@true if the event had listeners}
	 */

	/**
	 * Check if the item has one or more event handlers of the specified type.
	 *
	 * @name Item#responds
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @return {Boolean} {@true if the item has one or more event handlers of
	 * the specified type}
	 */

	/**
	 * Private method that sets Path related styles on the canvas context.
	 * Not defined in Path as it is required by other classes too,
	 * e.g. PointText.
	 */
	_setStyles: function(ctx) {
		// We can access internal properties since we're only using this on
		// items without children, where styles would be merged.
		var style = this._style,
			fillColor = style.getFillColor(),
			strokeColor = style.getStrokeColor(),
			shadowColor = style.getShadowColor();
		if (fillColor)
			ctx.fillStyle = fillColor.toCanvasStyle(ctx);
		if (strokeColor) {
			var strokeWidth = style.getStrokeWidth();
			if (strokeWidth > 0) {
				ctx.strokeStyle = strokeColor.toCanvasStyle(ctx);
				ctx.lineWidth = strokeWidth;
				var strokeJoin = style.getStrokeJoin(),
					strokeCap = style.getStrokeCap(),
					miterLimit = style.getMiterLimit();
				if (strokeJoin)
					ctx.lineJoin = strokeJoin;
				if (strokeCap)
					ctx.lineCap = strokeCap;
				if (miterLimit)
					ctx.miterLimit = miterLimit;
				if (paper.support.nativeDash) {
					var dashArray = style.getDashArray(),
						dashOffset = style.getDashOffset();
					if (dashArray && dashArray.length) {
						if ('setLineDash' in ctx) {
							ctx.setLineDash(dashArray);
							ctx.lineDashOffset = dashOffset;
						} else {
							ctx.mozDash = dashArray;
							ctx.mozDashOffset = dashOffset;
						}
					}
				}
			}
		}
		if (shadowColor) {
			var shadowBlur = style.getShadowBlur();
			if (shadowBlur > 0) {
				ctx.shadowColor = shadowColor.toCanvasStyle(ctx);
				ctx.shadowBlur = shadowBlur;
				var offset = this.getShadowOffset();
				ctx.shadowOffsetX = offset.x;
				ctx.shadowOffsetY = offset.y;
			}
		}
	},

	draw: function(ctx, param, parentStrokeMatrix) {
		// Each time the project gets drawn, it's _updateVersion is increased.
		// Keep the _updateVersion of drawn items in sync, so we have an easy
		// way to know for which selected items we need to draw selection info.
		var updateVersion = this._updateVersion = this._project._updateVersion;
		// Now bail out if no actual drawing is required.
		if (!this._visible || this._opacity === 0)
			return;
		// Keep calculating the current global matrix, by keeping a history
		// and pushing / popping as we go along.
		var matrices = param.matrices,
			viewMatrix = param.viewMatrix,
			matrix = this._matrix,
			globalMatrix = matrices[matrices.length - 1].chain(matrix);
		// If this item is not invertible, do not draw it, since it would cause
		// empty ctx.currentPath and mess up caching. It appears to also be a
		// good idea generally to not draw in such circumstances, e.g. SVG
		// handles it the same way.
		if (!globalMatrix.isInvertible())
			return;

		// Since globalMatrix does not take the view's matrix into account (we
		// could have multiple views with different zooms), we may have to
		// pre-concatenate the view's matrix.
		// Note that it's only provided if it isn't the identity matrix.
		function getViewMatrix(matrix) {
			return viewMatrix ? viewMatrix.chain(matrix) : matrix;
		}

		// Only keep track of transformation if told so. See Project#draw()
		matrices.push(globalMatrix);
		if (param.updateMatrix) {
			// Update the cached _globalMatrix and keep it versioned.
			globalMatrix._updateVersion = updateVersion;
			this._globalMatrix = globalMatrix;
		}

		// If the item has a blendMode or is defining an opacity, draw it on
		// a temporary canvas first and composite the canvas afterwards.
		// Paths with an opacity < 1 that both define a fillColor
		// and strokeColor also need to be drawn on a temporary canvas
		// first, since otherwise their stroke is drawn half transparent
		// over their fill.
		// Exclude Raster items since they never draw a stroke and handle
		// opacity by themselves (they also don't call _setStyles)
		var blendMode = this._blendMode,
			opacity = this._opacity,
			normalBlend = blendMode === 'normal',
			nativeBlend = BlendMode.nativeModes[blendMode],
			// Determine if we can draw directly, or if we need to draw into a
			// separate canvas and then composite onto the main canvas.
			direct = normalBlend && opacity === 1
					|| param.dontStart // e.g. CompoundPath
					|| param.clip
					// If native blending is possible, see if the item allows it
					|| (nativeBlend || normalBlend && opacity < 1)
						&& this._canComposite(),
			pixelRatio = param.pixelRatio || 1,
			mainCtx, itemOffset, prevOffset;
		if (!direct) {
			// Apply the parent's global matrix to the calculation of correct
			// bounds.
			var bounds = this.getStrokeBounds(getViewMatrix(globalMatrix));
			if (!bounds.width || !bounds.height)
				return;
			// Store previous offset and save the main context, so we can
			// draw onto it later.
			prevOffset = param.offset;
			// Floor the offset and ceil the size, so we don't cut off any
			// antialiased pixels when drawing onto the temporary canvas.
			itemOffset = param.offset = bounds.getTopLeft().floor();
			// Set ctx to the context of the temporary canvas, so we draw onto
			// it, instead of the mainCtx.
			mainCtx = ctx;
			ctx = CanvasProvider.getContext(bounds.getSize().ceil().add(1)
					.multiply(pixelRatio));
			if (pixelRatio !== 1)
				ctx.scale(pixelRatio, pixelRatio);
		}
		ctx.save();
		// Get the transformation matrix for non-scaling strokes.
		var strokeMatrix = parentStrokeMatrix
				? parentStrokeMatrix.chain(matrix)
				: !this.getStrokeScaling(true) && getViewMatrix(globalMatrix),
			// If we're drawing into a separate canvas and a clipItem is defined
			// for the current rendering loop, we need to draw the clip item
			// again.
			clip = !direct && param.clipItem,
			// If we're drawing with a strokeMatrix, the CTM is reset either way
			// so we don't need to set it, except when we also have to draw a
			// clipItem.
			transform = !strokeMatrix || clip;
		// If drawing directly, handle opacity and native blending now,
		// otherwise we will do it later when the temporary canvas is composited.
		if (direct) {
			ctx.globalAlpha = opacity;
			if (nativeBlend)
				ctx.globalCompositeOperation = blendMode;
		} else if (transform) {
			// Translate the context so the topLeft of the item is at (0, 0)
			// on the temporary canvas.
			ctx.translate(-itemOffset.x, -itemOffset.y);
		}
		// Apply globalMatrix when drawing into temporary canvas.
		if (transform)
			(direct ? matrix : getViewMatrix(globalMatrix)).applyToContext(ctx);
		if (clip)
			param.clipItem.draw(ctx, param.extend({ clip: true }));
		if (strokeMatrix) {
			// Reset the transformation but take HiDPI pixel ratio into account.
			ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
			// Also offset again when drawing non-directly.
			// NOTE: Don't use itemOffset since offset might be from the parent,
			// e.g. CompoundPath
			var offset = param.offset;
			if (offset)
				ctx.translate(-offset.x, -offset.y);
		}
		this._draw(ctx, param, strokeMatrix);
		ctx.restore();
		matrices.pop();
		if (param.clip && !param.dontFinish)
			ctx.clip();
		// If a temporary canvas was created, composite it onto the main canvas:
		if (!direct) {
			// Use BlendMode.process even for processing normal blendMode with
			// opacity.
			BlendMode.process(blendMode, ctx, mainCtx, opacity,
					// Calculate the pixel offset of the temporary canvas to the
					// main canvas. We also need to factor in the pixel-ratio.
					itemOffset.subtract(prevOffset).multiply(pixelRatio));
			// Return the temporary context, so it can be reused
			CanvasProvider.release(ctx);
			// Restore previous offset.
			param.offset = prevOffset;
		}
	},

	/**
	 * Checks the _updateVersion of the item to see if it got drawn in the draw
	 * loop. If the version is out of sync, the item is either not in the DOM
	 * anymore or is invisible.
	 */
	_isUpdated: function(updateVersion) {
		var parent = this._parent;
		// For compound-paths, we need to use the _updateVersion of the parent,
		// because when using the ctx.currentPath optimization, the children
		// don't have to get drawn on each frame and thus won't change their
		// _updateVersion.
		if (parent instanceof CompoundPath)
			return parent._isUpdated(updateVersion);
		// In case a parent is visible but isn't drawn (e.g. opacity == 0), the
		// _updateVersion of all its children will not be updated, but the
		// children should still be considered updated, and selections should be
		// drawn for them. Excluded are only items with _visible == false:
		var updated = this._updateVersion === updateVersion;
		if (!updated && parent && parent._visible
				&& parent._isUpdated(updateVersion)) {
			this._updateVersion = updateVersion;
			updated = true;
		}
		return updated;
	},

	_drawSelection: function(ctx, matrix, size, selectedItems, updateVersion) {
		if ((this._drawSelected || this._boundsSelected)
				&& this._isUpdated(updateVersion)) {
			// Allow definition of selected color on a per item and per
			// layer level, with a fallback to #009dec
			var color = this.getSelectedColor(true)
					|| this.getLayer().getSelectedColor(true),
				mx = matrix.chain(this.getGlobalMatrix(true));
			ctx.strokeStyle = ctx.fillStyle = color
					? color.toCanvasStyle(ctx) : '#009dec';
			if (this._drawSelected)
				this._drawSelected(ctx, mx, selectedItems);
			if (this._boundsSelected) {
				var half = size / 2,
					coords = mx._transformCorners(this.getInternalBounds());
				// Now draw a rectangle that connects the transformed
				// bounds corners, and draw the corners.
				ctx.beginPath();
				for (var i = 0; i < 8; i++)
					ctx[i === 0 ? 'moveTo' : 'lineTo'](coords[i], coords[++i]);
				ctx.closePath();
				ctx.stroke();
				for (var i = 0; i < 8; i++)
					ctx.fillRect(coords[i] - half, coords[++i] - half,
							size, size);
			}
		}
	},

	_canComposite: function() {
		return false;
	}
}, Base.each(['down', 'drag', 'up', 'move'], function(name) {
	this['removeOn' + Base.capitalize(name)] = function() {
		var hash = {};
		hash[name] = true;
		return this.removeOn(hash);
	};
}, /** @lends Item# */{
	/**
	 * {@grouptitle Remove On Event}
	 *
	 * Removes the item when the events specified in the passed object literal
	 * occur.
	 * The object literal can contain the following values:
	 * Remove the item when the next {@link Tool#onMouseMove} event is
	 * fired: {@code object.move = true}
	 *
	 * Remove the item when the next {@link Tool#onMouseDrag} event is
	 * fired: {@code object.drag = true}
	 *
	 * Remove the item when the next {@link Tool#onMouseDown} event is
	 * fired: {@code object.down = true}
	 *
	 * Remove the item when the next {@link Tool#onMouseUp} event is
	 * fired: {@code object.up = true}
	 *
	 * @name Item#removeOn
	 * @function
	 * @param {Object} object
	 *
	 * @example {@paperscript height=200}
	 * // Click and drag below:
	 * function onMouseDrag(event) {
	 *	   // Create a circle shaped path at the mouse position,
	 *	   // with a radius of 10:
	 *	   var path = new Path.Circle({
	 *		   center: event.point,
	 *		   radius: 10,
	 *		   fillColor: 'black'
	 *	   });
	 *
	 *	   // Remove the path on the next onMouseDrag or onMouseDown event:
	 *	   path.removeOn({
	 *		   drag: true,
	 *		   down: true
	 *	   });
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseMove} event is fired.
	 *
	 * @name Item#removeOnMove
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Move your mouse below:
	 * function onMouseMove(event) {
	 *	   // Create a circle shaped path at the mouse position,
	 *	   // with a radius of 10:
	 *	   var path = new Path.Circle({
	 *		   center: event.point,
	 *		   radius: 10,
	 *		   fillColor: 'black'
	 *	   });
	 *
	 *	   // On the next move event, automatically remove the path:
	 *	   path.removeOnMove();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseDown} event is fired.
	 *
	 * @name Item#removeOnDown
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Click a few times below:
	 * function onMouseDown(event) {
	 *	   // Create a circle shaped path at the mouse position,
	 *	   // with a radius of 10:
	 *	   var path = new Path.Circle({
	 *		   center: event.point,
	 *		   radius: 10,
	 *		   fillColor: 'black'
	 *	   });
	 *
	 *	   // Remove the path, next time the mouse is pressed:
	 *	   path.removeOnDown();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseDrag} event is fired.
	 *
	 * @name Item#removeOnDrag
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Click and drag below:
	 * function onMouseDrag(event) {
	 *	   // Create a circle shaped path at the mouse position,
	 *	   // with a radius of 10:
	 *	   var path = new Path.Circle({
	 *		   center: event.point,
	 *		   radius: 10,
	 *		   fillColor: 'black'
	 *	   });
	 *
	 *	   // On the next drag event, automatically remove the path:
	 *	   path.removeOnDrag();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseUp} event is fired.
	 *
	 * @name Item#removeOnUp
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Click a few times below:
	 * function onMouseDown(event) {
	 *	   // Create a circle shaped path at the mouse position,
	 *	   // with a radius of 10:
	 *	   var path = new Path.Circle({
	 *		   center: event.point,
	 *		   radius: 10,
	 *		   fillColor: 'black'
	 *	   });
	 *
	 *	   // Remove the path, when the mouse is released:
	 *	   path.removeOnUp();
	 * }
	 */
	// TODO: implement Item#removeOnFrame
	removeOn: function(obj) {
		for (var name in obj) {
			if (obj[name]) {
				var key = 'mouse' + name,
					project = this._project,
					sets = project._removeSets = project._removeSets || {};
				sets[key] = sets[key] || {};
				sets[key][this._id] = this;
			}
		}
		return this;
	}
}));

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
 * @name Group
 *
 * @class A Group is a collection of items. When you transform a Group, its
 * children are treated as a single unit without changing their relative
 * positions.
 *
 * @extends Item
 */
var Group = Item.extend(/** @lends Group# */{
	_class: 'Group',
	_selectChildren: true,
	_serializeFields: {
		children: []
	},

	// DOCS: document new Group(item, item...);
	/**
	 * Creates a new Group item and places it at the top of the active layer.
	 *
	 * @name Group#initialize
	 * @param {Item[]} [children] An array of children that will be added to the
	 * newly created group
	 *
	 * @example {@paperscript}
	 * // Create a group containing two paths:
	 * var path = new Path([100, 100], [100, 200]);
	 * var path2 = new Path([50, 150], [150, 150]);
	 *
	 * // Create a group from the two paths:
	 * var group = new Group([path, path2]);
	 *
	 * // Set the stroke color of all items in the group:
	 * group.strokeColor = 'black';
	 *
	 * // Move the group to the center of the view:
	 * group.position = view.center;
	 *
	 * @example {@paperscript height=320}
	 * // Click in the view to add a path to the group, which in turn is rotated
	 * // every frame:
	 * var group = new Group();
	 *
	 * function onMouseDown(event) {
	 *	   // Create a new circle shaped path at the position
	 *	   // of the mouse:
	 *	   var path = new Path.Circle(event.point, 5);
	 *	   path.fillColor = 'black';
	 *
	 *	   // Add the path to the group's children list:
	 *	   group.addChild(path);
	 * }
	 *
	 * function onFrame(event) {
	 *	   // Rotate the group by 1 degree from
	 *	   // the centerpoint of the view:
	 *	   group.rotate(1, view.center);
	 * }
	 */
	/**
	 * Creates a new Group item and places it at the top of the active layer.
	 *
	 * @name Group#initialize
	 * @param {Object} object an object literal containing the properties to be
	 * set on the group
	 *
	 * @example {@paperscript}
	 * var path = new Path([100, 100], [100, 200]);
	 * var path2 = new Path([50, 150], [150, 150]);
	 *
	 * // Create a group from the two paths:
	 * var group = new Group({
	 *	   children: [path, path2],
	 *	   // Set the stroke color of all items in the group:
	 *	   strokeColor: 'black',
	 *	   // Move the group to the center of the view:
	 *	   position: view.center
	 * });
	 */
	initialize: function Group(arg) {
		// Allow Group to have children and named children
		this._children = [];
		this._namedChildren = {};
		if (!this._initialize(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	_changed: function _changed(flags) {
		_changed.base.call(this, flags);
		if (flags & 1026) {
			// Clear cached clip item whenever hierarchy changes
			this._clipItem = undefined;
		}
	},

	_getClipItem: function() {
		// NOTE: _clipItem is the child that has _clipMask set to true.
		var clipItem = this._clipItem;
		// Distinguish null (no clipItem set) and undefined (clipItem was not
		// looked for yet).
		if (clipItem === undefined) {
			clipItem = null;
			for (var i = 0, l = this._children.length; i < l; i++) {
				var child = this._children[i];
				if (child._clipMask) {
					clipItem = child;
					break;
				}
			}
			this._clipItem = clipItem;
		}
		return clipItem;
	},

	/**
	 * Specifies whether the group item is to be clipped.
	 * When setting to {@code true}, the first child in the group is
	 * automatically defined as the clipping mask.
	 *
	 * @type Boolean
	 * @bean
	 *
	 * @example {@paperscript}
	 * var star = new Path.Star({
	 *	   center: view.center,
	 *	   points: 6,
	 *	   radius1: 20,
	 *	   radius2: 40,
	 *	   fillColor: 'red'
	 * });
	 *
	 * var circle = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 25,
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Create a group of the two items and clip it:
	 * var group = new Group(circle, star);
	 * group.clipped = true;
	 *
	 * // Lets animate the circle:
	 * function onFrame(event) {
	 *	   var offset = Math.sin(event.count / 30) * 30;
	 *	   circle.position.x = view.center.x + offset;
	 * }
	 */
	isClipped: function() {
		return !!this._getClipItem();
	},

	setClipped: function(clipped) {
		var child = this.getFirstChild();
		if (child)
			child.setClipMask(clipped);
	},

	_draw: function(ctx, param) {
		var clip = param.clip,
			clipItem = !clip && this._getClipItem(),
			draw = true;
		param = param.extend({ clipItem: clipItem, clip: false });
		if (clip) {
			// If told to clip with a group, we start our own path and draw each
			// child just like in a compound-path. We also cache the resulting
			// path in _currentPath.
			if (this._currentPath) {
				ctx.currentPath = this._currentPath;
				draw = false;
			} else {
				ctx.beginPath();
				param.dontStart = param.dontFinish = true;
			}
		} else if (clipItem) {
			clipItem.draw(ctx, param.extend({ clip: true }));
		}
		if (draw) {
			for (var i = 0, l = this._children.length; i < l; i++) {
				var item = this._children[i];
				if (item !== clipItem)
					item.draw(ctx, param);
			}
		}
		if (clip) {
			this._currentPath = ctx.currentPath;
		}
	}
});

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
 * @name Layer
 *
 * @class The Layer item represents a layer in a Paper.js project.
 *
 * The layer which is currently active can be accessed through
 * {@link Project#activeLayer}.
 * An array of all layers in a project can be accessed through
 * {@link Project#layers}.
 *
 * @extends Group
 */
var Layer = Group.extend(/** @lends Layer# */{
	_class: 'Layer',
	// Turn on again for now, since examples depend on it.
	// TODO: Discus with @puckey and come to a conclusion
	// _selectChildren: false,

	// DOCS: improve constructor code example.
	/**
	 * Creates a new Layer item and places it at the end of the
	 * {@link Project#layers} array. The newly created layer will be activated,
	 * so all newly created items will be placed within it.
	 *
	 * @name Layer#initialize
	 * @param {Item[]} [children] An array of items that will be added to the
	 * newly created layer
	 *
	 * @example
	 * var layer = new Layer();
	 */
	/**
	 * Creates a new Layer item and places it at the end of the
	 * {@link Project#layers} array. The newly created layer will be activated,
	 * so all newly created items will be placed within it.
	 *
	 * @name Layer#initialize
	 * @param {Object} object an object literal containing the properties to be
	 * set on the layer
	 *
	 * @example {@paperscript}
	 * var path = new Path([100, 100], [100, 200]);
	 * var path2 = new Path([50, 150], [150, 150]);
	 *
	 * // Create a layer. The properties in the object literal
	 * // are set on the newly created layer.
	 * var layer = new Layer({
	 *	   children: [path, path2],
	 *	   strokeColor: 'black',
	 *	   position: view.center
	 * });
	 */
	initialize: function Layer(arg) {
		var props = Base.isPlainObject(arg)
				? new Base(arg) // clone so we can add insert = false
				: { children: Array.isArray(arg) ? arg : arguments },
			insert = props.insert;
		// Call the group constructor but don't insert yet!
		props.insert = false;
		Group.call(this, props);
		if (insert || insert === undefined) {
			this._project.addChild(this);
			// When inserted, also activate the layer by default.
			this.activate();
		}
	},

	/**
	 * Removes the layer from its project's layers list
	 * or its parent's children list.
	 */
	_remove: function _remove(notifySelf, notifyParent) {
		if (this._parent)
			return _remove.base.call(this, notifySelf, notifyParent);
		if (this._index != null) {
			var project = this._project;
			if (project._activeLayer === this)
				project._activeLayer = this.getNextSibling()
						|| this.getPreviousSibling();
			Base.splice(project.layers, null, this._index, 1);
			this._installEvents(false);
			// Notify self of the insertion change. We only need this
			// notification if we're tracking changes for now.
			if (notifySelf && project._changes)
				this._changed(5);
			// Notify parent of changed children
			if (notifyParent) {
				// TODO: project._changed(undefined);
				// Tell project we need a redraw. This is similar to _changed()
				// mechanism.
				project._needsUpdate = true;
			}
			return true;
		}
		return false;
	},

	getNextSibling: function getNextSibling() {
		return this._parent ? getNextSibling.base.call(this)
				: this._project.layers[this._index + 1] || null;
	},

	getPreviousSibling: function getPreviousSibling() {
		return this._parent ? getPreviousSibling.base.call(this)
				: this._project.layers[this._index - 1] || null;
	},

	isInserted: function isInserted() {
		return this._parent ? isInserted.base.call(this) : this._index != null;
	},

	/**
	 * Activates the layer.
	 *
	 * @example
	 * var firstLayer = project.activeLayer;
	 * var secondLayer = new Layer();
	 * console.log(project.activeLayer == secondLayer); // true
	 * firstLayer.activate();
	 * console.log(project.activeLayer == firstLayer); // true
	 */
	activate: function() {
		this._project._activeLayer = this;
	},

	// Private helper for #insertAbove() / #insertBelow()
	_insertSibling: function _insertSibling(index, item, _preserve) {
		// If the item is a layer and contained within Project#layers, use
		// our own version of move().
		return !this._parent
				? this._project.insertChild(index, item, _preserve)
				: _insertSibling.base.call(this, index, item, _preserve);
	}
});

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
 * @name Shape
 *
 * @class
 *
 * @extends Item
 */
var Shape = Item.extend(/** @lends Shape# */{
	_class: 'Shape',
	_applyMatrix: false,
	_canApplyMatrix: false,
	_boundsSelected: true,
	_serializeFields: {
		type: null,
		size: null,
		radius: null
	},

	initialize: function Shape(props) {
		this._initialize(props);
	},

	_equals: function(item) {
		return this._type === item._type
			&& this._size.equals(item._size)
			// Radius can be a number or size:
			&& Base.equals(this._radius, item._radius);
	},

	clone: function(insert) {
		var copy = new Shape(Item.NO_INSERT);
		copy.setType(this._type);
		copy.setSize(this._size);
		copy.setRadius(this._radius);
		return this._clone(copy, insert);
	},

	/**
	 * The type of shape of the item as a string.
	 *
	 * @type String('rectangle', 'circle', 'ellipse')
	 * @bean
	 */
	getType: function() {
		return this._type;
	},

	setType: function(type) {
		this._type = type;
	},

	/**
	 * @private
	 * @bean
	 * @deprecated use {@link #type} instead.
	 */
	getShape: '#getType',
	setShape: '#setType',

	/**
	 * The size of the shape.
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function() {
		var size = this._size;
		return new LinkedSize(size.width, size.height, this, 'setSize');
	},

	setSize: function(/* size */) {
		var size = Size.read(arguments);
		if (!this._size) {
			// First time, e.g. whean reading from JSON...
			this._size = size.clone();
		} else if (!this._size.equals(size)) {
			var type = this._type,
				width = size.width,
				height = size.height;
			if (type === 'rectangle') {
				// Shrink radius accordingly
				var radius = Size.min(this._radius, size.divide(2));
				this._radius.set(radius.width, radius.height);
			} else if (type === 'circle') {
				// Use average of width and height as new size, then calculate
				// radius as a number from that:
				width = height = (width + height) / 2;
				this._radius = width / 2;
			} else if (type === 'ellipse') {
				// The radius is a size.
				this._radius.set(width / 2, height / 2);
			}
			this._size.set(width, height);
			this._changed(9);
		}
	},

	/**
	 * The radius of the shape, as a number if it is a circle, or a size object
	 * for ellipses and rounded rectangles.
	 *
	 * @type Number|Size
	 * @bean
	 */
	getRadius: function() {
		var rad = this._radius;
		return this._type === 'circle'
				? rad
				: new LinkedSize(rad.width, rad.height, this, 'setRadius');
	},

	setRadius: function(radius) {
		var type = this._type;
		if (type === 'circle') {
			if (radius === this._radius)
				return;
			var size = radius * 2;
			this._radius = radius;
			this._size.set(size, size);
		} else {
			radius = Size.read(arguments);
			if (!this._radius) {
				// First time, e.g. whean reading from JSON...
				this._radius = radius.clone();
			} else {
				if (this._radius.equals(radius))
					return;
				this._radius.set(radius.width, radius.height);
				if (type === 'rectangle') {
					// Grow size accordingly
					var size = Size.max(this._size, radius.multiply(2));
					this._size.set(size.width, size.height);
				} else if (type === 'ellipse') {
					this._size.set(radius.width * 2, radius.height * 2);
				}
			}
		}
		this._changed(9);
	},

	isEmpty: function() {
		// A shape can never be "empty" in the sense that it always holds a
		// definition. This is required for Group#bounds to work correctly when
		// containing a Shape.
		return false;
	},

	/**
	 * Creates a new path item with same geometry as this shape item, and
	 * inherits all settings from it, similar to {@link Item#clone()}.
	 *
	 * @param {Boolean} [insert=true] specifies whether the new path should be
	 * inserted into the DOM. When set to {@code true}, it is inserted above the
	 * shape item
	 * @return {Shape} the newly created path item with the same geometry as
	 * this shape item
	 * @see Path#toShape(insert)
	 */
	toPath: function(insert) {
		var path = this._clone(new Path[Base.capitalize(this._type)]({
			center: new Point(),
			size: this._size,
			radius: this._radius/*,
			insert: false*/
		}), insert);
		// The created path will inherit #applyMatrix from this Shape, hence it
		// will always be false.
		// Respect the setting of paper.settings.applyMatrix for new paths:
		if (paper.settings.applyMatrix)
			path.setApplyMatrix(true);
		return path;
	},

	_draw: function(ctx, param, strokeMatrix) {
		var style = this._style,
			hasFill = style.hasFill(),
			hasStroke = style.hasStroke(),
			dontPaint = param.dontFinish || param.clip,
			untransformed = !strokeMatrix;
		if (hasFill || hasStroke || dontPaint) {
			var type = this._type,
				radius = this._radius,
				isCircle = type === 'circle';
			if (!param.dontStart)
				ctx.beginPath();
			if (untransformed && isCircle) {
				ctx.arc(0, 0, radius, 0, Math.PI * 2, true);
			} else {
				var rx = isCircle ? radius : radius.width,
					ry = isCircle ? radius : radius.height,
					size = this._size,
					width = size.width,
					height = size.height;
				if (untransformed && type === 'rectangle' && rx === 0 && ry === 0) {
					// Rectangles with no rounding
					ctx.rect(-width / 2, -height / 2, width, height);
				} else {
					// Round rectangles, ellipses, transformed circles
					var x = width / 2,
						y = height / 2,
						// Use 1 - KAPPA to calculate position of control points
						// from the corners inwards.
						kappa = 1 - 0.5522847498307936,
						cx = rx * kappa,
						cy = ry * kappa,
						// Build the coordinates list, so it can optionally be
						// transformed by the strokeMatrix.
						c = [
							-x, -y + ry,
							-x, -y + cy,
							-x + cx, -y,
							-x + rx, -y,
							x - rx, -y,
							x - cx, -y,
							x, -y + cy,
							x, -y + ry,
							x, y - ry,
							x, y - cy,
							x - cx, y,
							x - rx, y,
							-x + rx, y,
							-x + cx, y,
							-x, y - cy,
							-x, y - ry
						];
					if (strokeMatrix)
						strokeMatrix.transform(c, c, 32);
					ctx.moveTo(c[0], c[1]);
					ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
					if (x !== rx)
						ctx.lineTo(c[8], c[9]);
					ctx.bezierCurveTo(c[10], c[11], c[12], c[13], c[14], c[15]);
					if (y !== ry)
						ctx.lineTo(c[16], c[17]);
					ctx.bezierCurveTo(c[18], c[19], c[20], c[21], c[22], c[23]);
					if (x !== rx)
						ctx.lineTo(c[24], c[25]);
					ctx.bezierCurveTo(c[26], c[27], c[28], c[29], c[30], c[31]);
				}
			}
			ctx.closePath();
		}
		if (!dontPaint && (hasFill || hasStroke)) {
			this._setStyles(ctx);
			if (hasFill) {
				ctx.fill(style.getWindingRule());
				ctx.shadowColor = 'rgba(0,0,0,0)';
			}
			if (hasStroke)
				ctx.stroke();
		}
	},

	_canComposite: function() {
		// A path with only a fill	or a stroke can be directly blended, but if
		// it has both, it needs to be drawn into a separate canvas first.
		return !(this.hasFill() && this.hasStroke());
	},

	_getBounds: function(getter, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		if (getter !== 'getBounds' && this.hasStroke())
			rect = rect.expand(this.getStrokeWidth());
		return matrix ? matrix._transformBounds(rect) : rect;
	}
},
new function() { // Scope for _contains() and _hitTestSelf() code.
	// Returns the center of the quarter corner ellipse for rounded rectangle,
	// if the point lies within its bounding box.
	function getCornerCenter(that, point, expand) {
		var radius = that._radius;
		if (!radius.isZero()) {
			var halfSize = that._size.divide(2);
			for (var i = 0; i < 4; i++) {
				// Calculate the bounding boxes of the four quarter ellipses
				// that define the rounded rectangle, and hit-test these.
				var dir = new Point(i & 1 ? 1 : -1, i > 1 ? 1 : -1),
					corner = dir.multiply(halfSize),
					center = corner.subtract(dir.multiply(radius)),
					rect = new Rectangle(corner, center);
				if ((expand ? rect.expand(expand) : rect).contains(point))
					return center;
			}
		}
	}

	// Calculates the length of the ellipse radius that passes through the point
	function getEllipseRadius(point, radius) {
		var angle = point.getAngleInRadians(),
			width = radius.width * 2,
			height = radius.height * 2,
			x = width * Math.sin(angle),
			y = height * Math.cos(angle);
		return width * height / (2 * Math.sqrt(x * x + y * y));
	}

	return /** @lends Shape# */{
		_contains: function _contains(point) {
			if (this._type === 'rectangle') {
				var center = getCornerCenter(this, point);
				return center
						// If there's a quarter ellipse center, use the same
						// check as for ellipses below.
						? point.subtract(center).divide(this._radius)
							.getLength() <= 1
						: _contains.base.call(this, point);
			} else {
				return point.divide(this.size).getLength() <= 0.5;
			}
		},

		_hitTestSelf: function _hitTestSelf(point, options) {
			var hit = false;
			if (this.hasStroke()) {
				var type = this._type,
					radius = this._radius,
					strokeWidth = this.getStrokeWidth() + 2 * options.tolerance;
				if (type === 'rectangle') {
					var center = getCornerCenter(this, point, strokeWidth);
					if (center) {
						// Check the stroke of the quarter corner ellipse,
						// similar to the ellipse check further down:
						var pt = point.subtract(center);
						hit = 2 * Math.abs(pt.getLength()
								- getEllipseRadius(pt, radius)) <= strokeWidth;
					} else {
						var rect = new Rectangle(this._size).setCenter(0, 0),
							outer = rect.expand(strokeWidth),
							inner = rect.expand(-strokeWidth);
						hit = outer._containsPoint(point)
								&& !inner._containsPoint(point);
					}
				} else {
					if (type === 'ellipse')
						radius = getEllipseRadius(point, radius);
					hit = 2 * Math.abs(point.getLength() - radius)
							<= strokeWidth;
				}
			}
			return hit
					? new HitResult('stroke', this)
					: _hitTestSelf.base.apply(this, arguments);
		}
	};
}, {
// Mess with indentation in order to get more line-space below:
statics: new function() {
	function createShape(type, point, size, radius, args) {
		var item = new Shape(Base.getNamed(args));
		item._type = type;
		item._size = size;
		item._radius = radius;
		return item.translate(point);
	}

	return /** @lends Shape */{
		/**
		 * Creates a circular shape item.
		 *
		 * @name Shape.Circle
		 * @param {Point} center the center point of the circle
		 * @param {Number} radius the radius of the circle
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Circle(new Point(80, 50), 30);
		 * shape.strokeColor = 'black';
		 */
		/**
		 * Creates a circular shape item from the properties described by an
		 * object literal.
		 *
		 * @name Shape.Circle
		 * @param {Object} object an object literal containing properties
		 * describing the shape's attributes
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Circle({
		 *	   center: [80, 50],
		 *	   radius: 30,
		 *	   strokeColor: 'black'
		 * });
		 */
		Circle: function(/* center, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return createShape('circle', center, new Size(radius * 2), radius,
					arguments);
		},

		/**
		 * Creates a rectangular shape item, with optionally rounded corners.
		 *
		 * @name Shape.Rectangle
		 * @param {Rectangle} rectangle the rectangle object describing the
		 * geometry of the rectangular shape to be created
		 * @param {Size} [radius=null] the size of the rounded corners
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
		 * var shape = new Shape.Rectangle(rectangle);
		 * shape.strokeColor = 'black';
		 *
		 * @example {@paperscript} // The same, with rounder corners
		 * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
		 * var cornerSize = new Size(10, 10);
		 * var shape = new Shape.Rectangle(rectangle, cornerSize);
		 * shape.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangular shape item from a point and a size object.
		 *
		 * @name Shape.Rectangle
		 * @param {Point} point the rectangle's top-left corner.
		 * @param {Size} size the rectangle's size.
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var point = new Point(20, 20);
		 * var size = new Size(60, 60);
		 * var shape = new Shape.Rectangle(point, size);
		 * shape.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangular shape item from the passed points. These do not
		 * necessarily need to be the top left and bottom right corners, the
		 * constructor figures out how to fit a rectangle between them.
		 *
		 * @name Shape.Rectangle
		 * @param {Point} from the first point defining the rectangle
		 * @param {Point} to the second point defining the rectangle
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var from = new Point(20, 20);
		 * var to = new Point(80, 80);
		 * var shape = new Shape.Rectangle(from, to);
		 * shape.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangular shape item from the properties described by an
		 * object literal.
		 *
		 * @name Shape.Rectangle
		 * @param {Object} object an object literal containing properties
		 * describing the shape's attributes
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Rectangle({
		 *	   point: [20, 20],
		 *	   size: [60, 60],
		 *	   strokeColor: 'black'
		 * });
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Rectangle({
		 *	   from: [20, 20],
		 *	   to: [80, 80],
		 *	   strokeColor: 'black'
		 * });
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Rectangle({
		 *	   rectangle: {
		 *		   topLeft: [20, 20],
		 *		   bottomRight: [80, 80]
		 *	   },
		 *	   strokeColor: 'black'
		 * });
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Rectangle({
		 *	topLeft: [20, 20],
		 *	   bottomRight: [80, 80],
		 *	   radius: 10,
		 *	   strokeColor: 'black'
		 * });
		 */
		Rectangle: function(/* rectangle */) {
			var rect = Rectangle.readNamed(arguments, 'rectangle'),
				radius = Size.min(Size.readNamed(arguments, 'radius'),
						rect.getSize(true).divide(2));
			return createShape('rectangle', rect.getCenter(true),
					rect.getSize(true), radius, arguments);
		},

		/**
		 * Creates an elliptical shape item.
		 *
		 * @name Shape.Ellipse
		 * @param {Rectangle} rectangle the rectangle circumscribing the ellipse
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle(new Point(20, 20), new Size(180, 60));
		 * var shape = new Shape.Ellipse(rectangle);
		 * shape.fillColor = 'black';
		 */
		/**
		 * Creates an elliptical shape item from the properties described by an
		 * object literal.
		 *
		 * @name Shape.Ellipse
		 * @param {Object} object an object literal containing properties
		 * describing the shape's attributes
		 * @return {Shape} the newly created shape
		 *
		 * @example {@paperscript}
		 * var shape = new Shape.Ellipse({
		 *	   point: [20, 20],
		 *	   size: [180, 60],
		 *	   fillColor: 'black'
		 * });
		 *
		 * @example {@paperscript} // Placing by center and radius
		 * var shape = new Shape.Ellipse({
		 *	   center: [110, 50],
		 *	   radius: [90, 30],
		 *	   fillColor: 'black'
		 * });
		 */
		Ellipse: function(/* rectangle */) {
			var ellipse = Shape._readEllipse(arguments),
				radius = ellipse.radius;
			return createShape('ellipse', ellipse.center, radius.multiply(2),
					radius, arguments);
		},

		// Private method to read ellipse center and radius from arguments list,
		// shared with Path.Ellipse constructor.
		_readEllipse: function(args) {
			var center,
				radius;
			if (Base.hasNamed(args, 'radius')) {
				center = Point.readNamed(args, 'center');
				radius = Size.readNamed(args, 'radius');
			} else {
				var rect = Rectangle.readNamed(args, 'rectangle');
				center = rect.getCenter(true);
				radius = rect.getSize(true).divide(2);
			}
			return { center: center, radius: radius };
		}
	};
}});

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
 * @name Raster
 *
 * @class The Raster item represents an image in a Paper.js project.
 *
 * @extends Item
 */
var Raster = Item.extend(/** @lends Raster# */{
	_class: 'Raster',
	_applyMatrix: false,
	_canApplyMatrix: false,
	// Raster doesn't make the distinction between the different bounds,
	// so use the same name for all of them
	_boundsGetter: 'getBounds',
	_boundsSelected: true,
	_serializeFields: {
		crossOrigin: null, // NOTE: Needs to be set before source to work!
		source: null
	},

	// TODO: Implement type, width, height.
	// TODO: Have PlacedSymbol & Raster inherit from a shared class?
	/**
	 * Creates a new raster item from the passed argument, and places it in the
	 * active layer. {@code object} can either be a DOM Image, a Canvas, or a
	 * string describing the URL to load the image from, or the ID of a DOM
	 * element to get the image from (either a DOM Image or a Canvas).
	 *
	 * @param {HTMLImageElement|HTMLCanvasElement|String} [source] the source of
	 * the raster
	 * @param {Point} [position] the center position at which the raster item is
	 * placed
	 *
	 * @example {@paperscript height=300} // Creating a raster using a url
	 * var url = 'http://assets.paperjs.org/images/marilyn.jpg';
	 * var raster = new Raster(url);
	 *
	 * // If you create a Raster using a url, you can use the onLoad
	 * // handler to do something once it is loaded:
	 * raster.onLoad = function() {
	 *	   console.log('The image has loaded.');
	 * };
	 *
	 * @example // Creating a raster using the id of a DOM Image:
	 *
	 * // Create a raster using the id of the image:
	 * var raster = new Raster('art');
	 *
	 * @example // Creating a raster using a DOM Image:
	 *
	 * // Find the element using its id:
	 * var imageElement = document.getElementById('art');
	 *
	 * // Create the raster:
	 * var raster = new Raster(imageElement);
	 *
	 * @example {@paperscript height=300}
	 * var raster = new Raster({
	 *	   source: 'http://assets.paperjs.org/images/marilyn.jpg',
	 *	   position: view.center
	 * });
	 *
	 * raster.scale(0.5);
	 * raster.rotate(10);
	 */
	initialize: function Raster(object, position) {
		// Support two forms of item initialization: Passing one object literal
		// describing all the different properties to be set, or an image
		// (object) and a point where it should be placed (point).
		// If _initialize can set properties through object literal, we're done.
		// Otherwise we need to check the type of object:
		if (!this._initialize(object,
				position !== undefined && Point.read(arguments, 1))) {
			if (typeof object === 'string') {
				// Both data-urls and normal urls are supported here!
				this.setSource(object);
			} else {
				// #setImage() handles both canvas and image types.
				this.setImage(object);
			}
		}
		if (!this._size) {
			this._size = new Size();
			this._loaded = false;
		}
	},

	_equals: function(item) {
		return this.getSource() === item.getSource();
	},

	clone: function(insert) {
		var copy = new Raster(Item.NO_INSERT),
			image = this._image,
			canvas = this._canvas;
		if (image) {
			copy.setImage(image);
		} else if (canvas) {
			// If the Raster contains a Canvas object, we need to create a new
			// one and draw this raster's canvas on it.
			var copyCanvas = CanvasProvider.getCanvas(this._size);
			copyCanvas.getContext('2d').drawImage(canvas, 0, 0);
			copy.setImage(copyCanvas);
		}
		copy._crossOrigin = this._crossOrigin;
		return this._clone(copy, insert);
	},

	/**
	 * The size of the raster in pixels.
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function() {
		var size = this._size;
		return new LinkedSize(size ? size.width : 0, size ? size.height : 0,
				this, 'setSize');
	},

	setSize: function(/* size */) {
		var size = Size.read(arguments);
		if (!size.equals(this._size)) { // NOTE: this._size could be null
			if (size.width > 0 && size.height > 0) {
				// Get reference to image before changing canvas.
				var element = this.getElement();
				// NOTE: Setting canvas internally sets _size.
				// NOTE: No need to release previous canvas as #setImage() does.
				this.setImage(CanvasProvider.getCanvas(size));
				// Draw element back onto new canvas.
				if (element)
					this.getContext(true).drawImage(element, 0, 0,
							size.width, size.height);
			} else {
				// 0-width / height dimensions do not require the creation of
				// an internal canvas. Just reflect the size for now.
				if (this._canvas)
					CanvasProvider.release(this._canvas);
				this._size = size.clone();
			}
		}
	},

	/**
	 * The width of the raster in pixels.
	 *
	 * @type Number
	 * @bean
	 */
	getWidth: function() {
		return this._size ? this._size.width : 0;
	},

	setWidth: function(width) {
		this.setSize(width, this.getHeight());
	},

	/**
	 * The height of the raster in pixels.
	 *
	 * @type Number
	 * @bean
	 */
	getHeight: function() {
		return this._size ? this._size.height : 0;
	},

	setHeight: function(height) {
		this.setSize(this.getWidth(), height);
	},

	isEmpty: function() {
		var size = this._size;
		return !size || size.width === 0 && size.height === 0;
	},

	/**
	 * The resolution of the raster at its current size, in PPI (pixels per
	 * inch).
	 *
	 * @type Size
	 * @bean
	 */
	getResolution: function() {
		var matrix = this._matrix,
			orig = new Point(0, 0).transform(matrix),
			u = new Point(1, 0).transform(matrix).subtract(orig),
			v = new Point(0, 1).transform(matrix).subtract(orig);
		return new Size(
			72 / u.getLength(),
			72 / v.getLength()
		);
	},

	/**
	 * @private
	 * @bean
	 * @deprecated use {@link #resolution} instead.
	 */
	getPpi: '#getResolution',

	/**
	 * The HTMLImageElement of the raster, if one is associated.
	 *
	 * @type HTMLImageElement|Canvas
	 * @bean
	 */
	getImage: function() {
		return this._image;
	},

	setImage: function(image) {
		if (this._canvas)
			CanvasProvider.release(this._canvas);
		// Due to similarities, we can handle both canvas and image types here.
		if (image && image.getContext) {
			// A canvas object
			this._image = null;
			this._canvas = image;
			this._loaded = true;
		} else {
			// A image object
			this._image = image;
			this._canvas = null;
			this._loaded = image && image.complete;
		}
		// Both canvas and image have width / height attributes. Due to IE,
		// naturalWidth / Height needs to be checked for a swell, because it
		// apparently can have width / height set to 0 when the image is
		// invisible in the document.
		this._size = new Size(
				image ? image.naturalWidth || image.width : 0,
				image ? image.naturalHeight || image.height : 0);
		this._context = null;
		this._changed(521);
	},

	/**
	 * The Canvas object of the raster. If the raster was created from an image,
	 * accessing its canvas causes the raster to try and create one and draw the
	 * image into it. Depending on security policies, this might fail, in which
	 * case {@code null} is returned instead.
	 *
	 * @type Canvas
	 * @bean
	 */
	getCanvas: function() {
		if (!this._canvas) {
			var ctx = CanvasProvider.getContext(this._size);
			// Since drawImage into canvas might fail based on security policies
			// wrap the call in try-catch and only set _canvas if we succeeded.
			try {
				if (this._image)
					ctx.drawImage(this._image, 0, 0);
				this._canvas = ctx.canvas;
			} catch (e) {
				CanvasProvider.release(ctx);
			}
		}
		return this._canvas;
	},

	// #setCanvas() is a simple alias to #setImage()
	setCanvas: '#setImage',

	/**
	 * The Canvas 2D drawing context of the raster.
	 *
	 * @type Context
	 * @bean
	 */
	getContext: function(modify) {
		if (!this._context)
			this._context = this.getCanvas().getContext('2d');
		// Support a hidden parameter that indicates if the context will be used
		// to modify the Raster object. We can notify such changes ahead since
		// they are only used afterwards for redrawing.
		if (modify) {
			// Also set _image to null since the Raster stops representing it.
			// NOTE: This should theoretically be in our own _changed() handler
			// for ChangeFlag.PIXELS, but since it's only happening in one place
			// this is fine:
			this._image = null;
			this._changed(513);
		}
		return this._context;
	},

	setContext: function(context) {
		this._context = context;
	},

	/**
	 * The source of the raster, which can be set using a DOM Image, a Canvas,
	 * a data url, a string describing the URL to load the image from, or the
	 * ID of a DOM element to get the image from (either a DOM Image or a
	 * Canvas). Reading this property will return the url of the source image or
	 * a data-url.
	 *
	 * @bean
	 * @type HTMLImageElement|HTMLCanvasElement|String
	 *
	 * @example {@paperscript}
	 * var raster = new Raster();
	 * raster.source = 'http://paperjs.org/about/paper-js.gif';
	 * raster.position = view.center;
	 *
	 * @example {@paperscript}
	 * var raster = new Raster({
	 *	   source: 'http://paperjs.org/about/paper-js.gif',
	 *	   position: view.center
	 * });
	 */
	getSource: function() {
		return this._image && this._image.src || this.toDataURL();
	},

	setSource: function(src) {
		var that = this,
			crossOrigin = this._crossOrigin,
			image;

		function loaded() {
			var view = that.getView();
			if (view) {
				paper = view._scope;
				that.setImage(image);
				that.emit('load');
				view.update();
			}
		}

		image = new Image();
		if (crossOrigin)
			image.crossOrigin = crossOrigin;
		// If we're running on the server and it's a string,
		// check if it is a data URL
		if (/^data:/.test(src)) {
			// Preserve the data in this._data since canvas-node eats it.
			// TODO: Fix canvas-node instead
			image.src = this._data = src;
			// Emit load event with a delay, so behavior is the same as when
			// it's actually loaded and we give the code time to install event.
			setTimeout(loaded, 0);
		} else if (/^https?:\/\//.test(src)) {
			// Load it from remote location:
			require('request').get({
				url: src,
				encoding: null // So the response data is a Buffer
			}, function (err, response, data) {
				if (err)
					throw err;
				if (response.statusCode == 200) {
					image.src = this._data = data;
					loaded();
				}
			});
		} else {
			// Load it from disk:
			require('fs').readFile(src, function (err, data) {
				if (err)
					throw err;
				image.src = this._data = data;
				loaded();
			});
		}
		this.setImage(image);
	},

	/**
	 * The crossOrigin value to be used when loading the image resource, in
	 * order to support CORS. Note that this needs to be set before setting the
	 * {@link #source} property in order to always work (e.g. when the image is
	 * cached in the browser).
	 *
	 * @bean
	 * @type String
	 *
	 * @example {@paperscript}
	 * var raster = new Raster({
	 *	   crossOrigin: 'anonymous',
	 *	   source: 'http://assets.paperjs.org/images/marilyn.jpg',
	 *	   position: view.center
	 * });
	 *
	 * console.log(view.element.toDataURL('image/png').substring(0, 32));
	 */
	getCrossOrigin: function() {
		return this._image && this._image.crossOrigin || this._crossOrigin || '';
	},

	setCrossOrigin: function(crossOrigin) {
		this._crossOrigin = crossOrigin;
		if (this._image)
			this._image.crossOrigin = crossOrigin;
	},

	// DOCS: document Raster#getElement
	getElement: function() {
		// Only return the internal element if the content is actually ready.
		return this._canvas || this._loaded && this._image;
	}
}, /** @lends Raster# */{
	// Explicitly deactivate the creation of beans, as we have functions here
	// that look like bean getters but actually read arguments.
	// See #getSubCanvas(), #getSubRaster(), #getSubRaster(), #getPixel(),
	// #getImageData()
	beans: false,

	/**
	 * Extracts a part of the Raster's content as a sub image, and returns it as
	 * a Canvas object.
	 *
	 * @param {Rectangle} rect the boundaries of the sub image in pixel
	 * coordinates
	 *
	 * @return {Canvas} the sub image as a Canvas object
	 */
	getSubCanvas: function(/* rect */) {
		var rect = Rectangle.read(arguments),
			ctx = CanvasProvider.getContext(rect.getSize());
		ctx.drawImage(this.getCanvas(), rect.x, rect.y,
				rect.width, rect.height, 0, 0, rect.width, rect.height);
		return ctx.canvas;
	},

	/**
	 * Extracts a part of the raster item's content as a new raster item, placed
	 * in exactly the same place as the original content.
	 *
	 * @param {Rectangle} rect the boundaries of the sub raster in pixel
	 * coordinates
	 *
	 * @return {Raster} the sub raster as a newly created raster item
	 */
	getSubRaster: function(/* rect */) {
		var rect = Rectangle.read(arguments),
			raster = new Raster(Item.NO_INSERT);
		raster.setImage(this.getSubCanvas(rect));
		raster.translate(rect.getCenter().subtract(this.getSize().divide(2)));
		raster._matrix.preConcatenate(this._matrix);
		raster.insertAbove(this);
		return raster;
	},

	/**
	 * Returns a Base 64 encoded {@code data:} URL representation of the raster.
	 *
	 * @return {String}
	 */
	toDataURL: function() {
		// See if the linked image is base64 encoded already, if so reuse it,
		// otherwise try using canvas.toDataURL()
		if (this._data) {
			if (this._data instanceof Buffer)
				this._data = this._data.toString('base64');
			return this._data;
		}
		var canvas = this.getCanvas();
		return canvas ? canvas.toDataURL.apply(canvas, arguments) : null;
	},

	/**
	 * Draws an image on the raster.
	 *
	 * @param {HTMLImageELement|Canvas} image
	 * @param {Point} point the offset of the image as a point in pixel
	 * coordinates
	 */
	drawImage: function(image /*, point */) {
		var point = Point.read(arguments, 1);
		this.getContext(true).drawImage(image, point.x, point.y);
	},

	/**
	 * Calculates the average color of the image within the given path,
	 * rectangle or point. This can be used for creating raster image
	 * effects.
	 *
	 * @param {Path|Rectangle|Point} object
	 * @return {Color} the average color contained in the area covered by the
	 * specified path, rectangle or point
	 */
	getAverageColor: function(object) {
		var bounds, path;
		if (!object) {
			bounds = this.getBounds();
		} else if (object instanceof PathItem) {
			// TODO: What if the path is smaller than 1 px?
			// TODO: How about rounding of bounds.size?
			path = object;
			bounds = object.getBounds();
		} else if (object.width) {
			bounds = new Rectangle(object);
		} else if (object.x) {
			// Create a rectangle of 1px size around the specified coordinates
			bounds = new Rectangle(object.x - 0.5, object.y - 0.5, 1, 1);
		}
		// Use a sample size of max 32 x 32 pixels, into which the path is
		// scaled as a clipping path, and then the actual image is drawn in and
		// sampled.
		var sampleSize = 32,
			width = Math.min(bounds.width, sampleSize),
			height = Math.min(bounds.height, sampleSize);
		// Reuse the same sample context for speed. Memory consumption is low
		// since it's only 32 x 32 pixels.
		var ctx = Raster._sampleContext;
		if (!ctx) {
			ctx = Raster._sampleContext = CanvasProvider.getContext(
					new Size(sampleSize));
		} else {
			// Clear the sample canvas:
			ctx.clearRect(0, 0, sampleSize + 1, sampleSize + 1);
		}
		ctx.save();
		// Scale the context so that the bounds ends up at the given sample size
		var matrix = new Matrix()
				.scale(width / bounds.width, height / bounds.height)
				.translate(-bounds.x, -bounds.y);
		matrix.applyToContext(ctx);
		// If a path was passed, draw it as a clipping mask:
		// See Project#draw() for an explanation of new Base()
		if (path)
			path.draw(ctx, new Base({ clip: true, matrices: [matrix] }));
		// Now draw the image clipped into it.
		this._matrix.applyToContext(ctx);
		var element = this.getElement(),
			size = this._size;
		if (element)
			ctx.drawImage(element, -size.width / 2, -size.height / 2);
		ctx.restore();
		// Get pixel data from the context and calculate the average color value
		// from it, taking alpha into account.
		var pixels = ctx.getImageData(0.5, 0.5, Math.ceil(width),
				Math.ceil(height)).data,
			channels = [0, 0, 0],
			total = 0;
		for (var i = 0, l = pixels.length; i < l; i += 4) {
			var alpha = pixels[i + 3];
			total += alpha;
			alpha /= 255;
			channels[0] += pixels[i] * alpha;
			channels[1] += pixels[i + 1] * alpha;
			channels[2] += pixels[i + 2] * alpha;
		}
		for (var i = 0; i < 3; i++)
			channels[i] /= total;
		return total ? Color.read(channels) : null;
	},

	/**
	 * {@grouptitle Pixels}
	 * Gets the color of a pixel in the raster.
	 *
	 * @name Raster#getPixel
	 * @function
	 * @param x the x offset of the pixel in pixel coordinates
	 * @param y the y offset of the pixel in pixel coordinates
	 * @return {Color} the color of the pixel
	 */
	/**
	 * Gets the color of a pixel in the raster.
	 *
	 * @name Raster#getPixel
	 * @function
	 * @param point the offset of the pixel as a point in pixel coordinates
	 * @return {Color} the color of the pixel
	 */
	getPixel: function(/* point */) {
		var point = Point.read(arguments);
		var data = this.getContext().getImageData(point.x, point.y, 1, 1).data;
		// Alpha is separate now:
		return new Color('rgb', [data[0] / 255, data[1] / 255, data[2] / 255],
				data[3] / 255);
	},

	/**
	 * Sets the color of the specified pixel to the specified color.
	 *
	 * @name Raster#setPixel
	 * @function
	 * @param x the x offset of the pixel in pixel coordinates
	 * @param y the y offset of the pixel in pixel coordinates
	 * @param color the color that the pixel will be set to
	 */
	/**
	 * Sets the color of the specified pixel to the specified color.
	 *
	 * @name Raster#setPixel
	 * @function
	 * @param point the offset of the pixel as a point in pixel coordinates
	 * @param color the color that the pixel will be set to
	 */
	setPixel: function(/* point, color */) {
		var point = Point.read(arguments),
			color = Color.read(arguments),
			components = color._convert('rgb'),
			alpha = color._alpha,
			ctx = this.getContext(true),
			imageData = ctx.createImageData(1, 1),
			data = imageData.data;
		data[0] = components[0] * 255;
		data[1] = components[1] * 255;
		data[2] = components[2] * 255;
		data[3] = alpha != null ? alpha * 255 : 255;
		ctx.putImageData(imageData, point.x, point.y);
	},

	// DOCS: document Raster#createImageData
	/**
	 * {@grouptitle Image Data}
	 * @param {Size} size
	 * @return {ImageData}
	 */
	createImageData: function(/* size */) {
		var size = Size.read(arguments);
		return this.getContext().createImageData(size.width, size.height);
	},

	// DOCS: document Raster#getImageData
	/**
	 * @param {Rectangle} rect
	 * @return {ImageData}
	 */
	getImageData: function(/* rect */) {
		var rect = Rectangle.read(arguments);
		if (rect.isEmpty())
			rect = new Rectangle(this._size);
		return this.getContext().getImageData(rect.x, rect.y,
				rect.width, rect.height);
	},

	// DOCS: document Raster#setImageData
	/**
	 * @param {ImageData} data
	 * @param {Point} point
	 */
	setImageData: function(data /*, point */) {
		var point = Point.read(arguments, 1);
		this.getContext(true).putImageData(data, point.x, point.y);
	},

	_getBounds: function(getter, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		return matrix ? matrix._transformBounds(rect) : rect;
	},

	_hitTestSelf: function(point) {
		if (this._contains(point)) {
			var that = this;
			return new HitResult('pixel', that, {
				offset: point.add(that._size.divide(2)).round(),
				// Inject as Straps.js accessor, so #toString renders well too
				color: {
					get: function() {
						return that.getPixel(this.offset);
					}
				}
			});
		}
	},

	_draw: function(ctx) {
		var element = this.getElement();
		if (element) {
			// Handle opacity for Rasters separately from the rest, since
			// Rasters never draw a stroke. See Item#draw().
			ctx.globalAlpha = this._opacity;
			ctx.drawImage(element,
					-this._size.width / 2, -this._size.height / 2);
		}
	},

	_canComposite: function() {
		return true;
	}
});

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
 * @name PlacedSymbol
 *
 * @class A PlacedSymbol represents an instance of a symbol which has been
 * placed in a Paper.js project.
 *
 * @extends Item
 */
var PlacedSymbol = Item.extend(/** @lends PlacedSymbol# */{
	_class: 'PlacedSymbol',
	_applyMatrix: false,
	_canApplyMatrix: false,
	// PlacedSymbol uses strokeBounds for bounds
	_boundsGetter: { getBounds: 'getStrokeBounds' },
	_boundsSelected: true,
	_serializeFields: {
		symbol: null
	},

	/**
	 * Creates a new PlacedSymbol Item.
	 *
	 * @param {Symbol} symbol the symbol to place
	 * @param {Point} [point] the center point of the placed symbol
	 *
	 * @example {@paperscript split=true height=240}
	 * // Placing 100 instances of a symbol:
	 * // Create a star shaped path at {x: 0, y: 0}:
	 * var path = new Path.Star({
	 *	   center: new Point(0, 0),
	 *	   points: 6,
	 *	   radius1: 5,
	 *	   radius2: 13,
	 *	   fillColor: 'white',
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Create a symbol from the path:
	 * var symbol = new Symbol(path);
	 *
	 * // Remove the path:
	 * path.remove();
	 *
	 * // Place 100 instances of the symbol:
	 * for (var i = 0; i < 100; i++) {
	 *	   // Place an instance of the symbol in the project:
	 *	   var instance = new PlacedSymbol(symbol);
	 *
	 *	   // Move the instance to a random position within the view:
	 *	   instance.position = Point.random() * view.size;
	 *
	 *	   // Rotate the instance by a random amount between
	 *	   // 0 and 360 degrees:
	 *	   instance.rotate(Math.random() * 360);
	 *
	 *	   // Scale the instance between 0.25 and 1:
	 *	   instance.scale(0.25 + Math.random() * 0.75);
	 * }
	 */
	initialize: function PlacedSymbol(arg0, arg1) {
		// Support two forms of item initialization: Passing one object literal
		// describing all the different properties to be set, or a symbol (arg0)
		// and a point where it should be placed (arg1).
		// If _initialize can set properties through object literal, we're done.
		// Otherwise we need to set symbol from arg0.
		if (!this._initialize(arg0,
				arg1 !== undefined && Point.read(arguments, 1)))
			this.setSymbol(arg0 instanceof Symbol ? arg0 : new Symbol(arg0));
	},

	_equals: function(item) {
		return this._symbol === item._symbol;
	},

	/**
	 * The symbol that the placed symbol refers to.
	 *
	 * @type Symbol
	 * @bean
	 */
	getSymbol: function() {
		return this._symbol;
	},

	setSymbol: function(symbol) {
		this._symbol = symbol;
		this._changed(9);
	},

	clone: function(insert) {
		var copy = new PlacedSymbol(Item.NO_INSERT);
		copy.setSymbol(this._symbol);
		return this._clone(copy, insert);
	},

	isEmpty: function() {
		return this._symbol._definition.isEmpty();
	},

	_getBounds: function(getter, matrix, cacheItem) {
		var definition = this.symbol._definition;
		// Redirect the call to the symbol definition to calculate the bounds
		return definition._getCachedBounds(getter,
				matrix && matrix.chain(definition._matrix), cacheItem);
	},

	_hitTestSelf: function(point, options) {
		var res = this._symbol._definition._hitTest(point, options);
		// TODO: When the symbol's definition is a path, should hitResult
		// contain information like HitResult#curve?
		if (res)
			res.item = this;
		return res;
	},

	_draw: function(ctx, param) {
		this.symbol._definition.draw(ctx, param);
	}

	// TODO: PlacedSymbol#embed()
});

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
 * @name HitResult
 *
 * @class A HitResult object contains information about the results of a hit
 * test. It is returned by {@link Item#hitTest(point)} and
 * {@link Project#hitTest(point)}.
 */
var HitResult = Base.extend(/** @lends HitResult# */{
	_class: 'HitResult',

	initialize: function HitResult(type, item, values) {
		this.type = type;
		this.item = item;
		// Inject passed values, so we can be flexible about the HitResult
		// properties.
		// This allows the definition of getters too, e.g. for 'pixel'.
		if (values) {
			// Make enumerable so toString() works.
			values.enumerable = true;
			this.inject(values);
		}
	},

	/**
	 * Describes the type of the hit result. For example, if you hit a segment
	 * point, the type would be 'segment'.
	 *
	 * @name HitResult#type
	 * @property
	 * @type String('segment', 'handle-in', 'handle-out', 'curve', 'stroke',
	 * 'fill', 'bounds', 'center', 'pixel')
	 */

	/**
	 * If the HitResult has a {@link HitResult#type} of 'bounds', this property
	 * describes which corner of the bounding rectangle was hit.
	 *
	 * @name HitResult#name
	 * @property
	 * @type String('top-left', 'top-right', 'bottom-left', 'bottom-right',
	 * 'left-center', 'top-center', 'right-center', 'bottom-center')
	 */

	/**
	 * The item that was hit.
	 *
	 * @name HitResult#item
	 * @property
	 * @type Item
	 */

	/**
	 * If the HitResult has a type of 'curve' or 'stroke', this property gives
	 * more information about the exact position that was hit on the path.
	 *
	 * @name HitResult#location
	 * @property
	 * @type CurveLocation
	 */

	/**
	 * If the HitResult has a type of 'pixel', this property refers to the color
	 * of the pixel on the {@link Raster} that was hit.
	 *
	 * @name HitResult#color
	 * @property
	 * @type Color
	 */

	/**
	 * If the HitResult has a type of 'stroke', 'segment', 'handle-in' or
	 * 'handle-out', this property refers to the segment that was hit or that
	 * is closest to the hitResult.location on the curve.
	 *
	 * @name HitResult#segment
	 * @property
	 * @type Segment
	 */

	/**
	 * Describes the actual coordinates of the segment, handle or bounding box
	 * corner that was hit.
	 *
	 * @name HitResult#point
	 * @property
	 * @type Point
	 */

	statics: {
		/**
		 * Merges default options into options hash for #hitTest() calls.
		 *
		 * @private
		 */
		getOptions: function(options) {
			return new Base({
				// Type of item, for instanceof check: Group, Layer, Path,
				// CompoundPath, Shape, Raster, PlacedSymbol, ...
				type: null,
				// Tolerance
				tolerance: paper.settings.hitTolerance,
				// Hit the fill of items
				fill: !options,
				// Hit the curves of path items, taking into account the stroke
				// width.
				stroke: !options,
				// Hit the part of segments that curves pass through, excluding
				// its segments (Segment#point)
				segments: !options,
				// Hit the parts of segments that define the curvature
				handles: false,
				// Only first or last segment hits on path (mutually exclusive
				// with segments: true)
				ends: false,
				// Hit test the center of the bounds
				center: false,
				// Hit test the corners and side-centers of the bounding box
				bounds: false,
				//	Hit items that are marked as guides
				guides: false,
				// Only hit selected objects
				selected: false
			}, options);
		}
	}
});


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
 * @name Segment
 *
 * @class The Segment object represents the points of a path through which its
 * {@link Curve} objects pass. The segments of a path can be accessed through
 * its {@link Path#segments} array.
 *
 * Each segment consists of an anchor point ({@link Segment#point}) and
 * optionaly an incoming and an outgoing handle ({@link Segment#handleIn} and
 * {@link Segment#handleOut}), describing the tangents of the two {@link Curve}
 * objects that are connected by this segment.
 */
var Segment = Base.extend(/** @lends Segment# */{
	_class: 'Segment',
	beans: true,

	/**
	 * Creates a new Segment object.
	 *
	 * @name Segment#initialize
	 * @param {Point} [point={x: 0, y: 0}] the anchor point of the segment
	 * @param {Point} [handleIn={x: 0, y: 0}] the handle point relative to the
	 * anchor point of the segment that describes the in tangent of the
	 * segment
	 * @param {Point} [handleOut={x: 0, y: 0}] the handle point relative to the
	 * anchor point of the segment that describes the out tangent of the
	 * segment
	 *
	 * @example {@paperscript}
	 * var handleIn = new Point(-80, -100);
	 * var handleOut = new Point(80, 100);
	 *
	 * var firstPoint = new Point(100, 50);
	 * var firstSegment = new Segment(firstPoint, null, handleOut);
	 *
	 * var secondPoint = new Point(300, 50);
	 * var secondSegment = new Segment(secondPoint, handleIn, null);
	 *
	 * var path = new Path(firstSegment, secondSegment);
	 * path.strokeColor = 'black';
	 */
	/**
	 * Creates a new Segment object.
	 *
	 * @name Segment#initialize
	 * @param {Object} object an object literal containing properties to
	 * be set on the segment
	 *
	 * @example {@paperscript}
	 * // Creating segments using object notation:
	 * var firstSegment = new Segment({
	 *	   point: [100, 50],
	 *	   handleOut: [80, 100]
	 * });
	 *
	 * var secondSegment = new Segment({
	 *	   point: [300, 50],
	 *	   handleIn: [-80, -100]
	 * });
	 *
	 * var path = new Path({
	 *	   segments: [firstSegment, secondSegment],
	 *	   strokeColor: 'black'
	 * });
	 */
	/**
	 * Creates a new Segment object.
	 *
	 * @param {Number} x the x coordinate of the segment point
	 * @param {Number} y the y coordinate of the segment point
	 * @param {Number} inX the x coordinate of the the handle point relative to
	 * the anchor point of the segment that describes the in tangent of the
	 * segment
	 * @param {Number} inY the y coordinate of the the handle point relative to
	 * the anchor point of the segment that describes the in tangent of the
	 * segment
	 * @param {Number} outX the x coordinate of the the handle point relative to
	 * the anchor point of the segment that describes the out tangent of the
	 * segment
	 * @param {Number} outY the y coordinate of the the handle point relative to
	 * the anchor point of the segment that describes the out tangent of the
	 * segment
	 *
	 * @example {@paperscript}
	 * var inX = -80;
	 * var inY = -100;
	 * var outX = 80;
	 * var outY = 100;
	 *
	 * var x = 100;
	 * var y = 50;
	 * var firstSegment = new Segment(x, y, inX, inY, outX, outY);
	 *
	 * var x2 = 300;
	 * var y2 = 50;
	 * var secondSegment = new Segment( x2, y2, inX, inY, outX, outY);
	 *
	 * var path = new Path(firstSegment, secondSegment);
	 * path.strokeColor = 'black';
	 * @ignore
	 */
	initialize: function Segment(arg0, arg1, arg2, arg3, arg4, arg5) {
		var count = arguments.length,
			point, handleIn, handleOut;
		// TODO: Use Point.read or Point.readNamed to read these?
		if (count === 0) {
			// Nothing
		} else if (count === 1) {
			// Note: This copies from existing segments through accessors.
			if ('point' in arg0) {
				point = arg0.point;
				handleIn = arg0.handleIn;
				handleOut = arg0.handleOut;
			} else {
				point = arg0;
			}
		} else if (count === 2 && typeof arg0 === 'number') {
			point = arguments;
		} else if (count <= 3) {
			point = arg0;
			// Doesn't matter if these arguments exist, SegmentPointcreate
			// produces creates points with (0, 0) otherwise
			handleIn = arg1;
			handleOut = arg2;
		} else { // Read points from the arguments list as a row of numbers
			point = arg0 !== undefined ? [ arg0, arg1 ] : null;
			handleIn = arg2 !== undefined ? [ arg2, arg3 ] : null;
			handleOut = arg4 !== undefined ? [ arg4, arg5 ] : null;
		}
		new SegmentPoint(point, this, '_point');
		new SegmentPoint(handleIn, this, '_handleIn');
		new SegmentPoint(handleOut, this, '_handleOut');
	},

	_serialize: function(options) {
		// If it is has no handles, only serialize point, otherwise handles too.
		return Base.serialize(this.hasHandles()
				? [this._point, this._handleIn, this._handleOut]
				: this._point,
				options, true);
	},

	_changed: function(point) {
		var path = this._path;
		if (!path)
			return;
		// Delegate changes to affected curves if they exist.
		var curves = path._curves,
			index = this._index,
			curve;
		if (curves) {
			// Updated the neighboring affected curves, depending on which point
			// is changing.
			// TODO: Consider exposing these curves too, through #curveIn,
			// and #curveOut, next to #curve?
			if ((!point || point === this._point || point === this._handleIn)
					&& (curve = index > 0 ? curves[index - 1] : path._closed
						? curves[curves.length - 1] : null))
				curve._changed();
			// No wrap around needed for outgoing curve, as only closed paths
			// will have one for the last segment.
			if ((!point || point === this._point || point === this._handleOut)
					&& (curve = curves[index]))
				curve._changed();
		}
		path._changed(25);
	},

	/**
	 * The anchor point of the segment.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		return this._point;
	},

	setPoint: function(/* point */) {
		var point = Point.read(arguments);
		// Do not replace the internal object but update it instead, so
		// references to it are kept alive.
		this._point.set(point.x, point.y);
	},

	/**
	 * The handle point relative to the anchor point of the segment that
	 * describes the in tangent of the segment.
	 *
	 * @type Point
	 * @bean
	 */
	getHandleIn: function() {
		return this._handleIn;
	},

	setHandleIn: function(/* point */) {
		var point = Point.read(arguments);
		// See #setPoint:
		this._handleIn.set(point.x, point.y);
	},

	/**
	 * The handle point relative to the anchor point of the segment that
	 * describes the out tangent of the segment.
	 *
	 * @type Point
	 * @bean
	 */
	getHandleOut: function() {
		return this._handleOut;
	},

	setHandleOut: function(/* point */) {
		var point = Point.read(arguments);
		// See #setPoint:
		this._handleOut.set(point.x, point.y);
	},

	/**
	 * Checks if the segment has any curve handles set.
	 *
	 * @return {Boolean} {@true if the segment has handles set}
	 * @see Segment#getHandleIn()
	 * @see Segment#getHandleOut()
	 * @see Curve#hasHandles()
	 * @see Path#hasHandles()
	 */
	hasHandles: function() {
		return !this._handleIn.isZero() || !this._handleOut.isZero();
	},

	/**
	 * Clears the segment's handles by setting their coordinates to zero,
	 * turning the segment into a corner.
	 */
	clearHandles: function() {
		this._handleIn.set(0, 0);
		this._handleOut.set(0, 0);
	},

	_selectionState: 0,

	/**
	 * Specifies whether the {@link #point} of the segment is selected.
	 * @type Boolean
	 * @bean
	 * @example {@paperscript}
	 * var path = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 40
	 * });
	 *
	 * // Select the third segment point:
	 * path.segments[2].selected = true;
	 */
	isSelected: function(_point) {
		var state = this._selectionState;
		return !_point ? !!(state & 7)
			: _point === this._point ? !!(state & 4)
			: _point === this._handleIn ? !!(state & 1)
			: _point === this._handleOut ? !!(state & 2)
			: false;
	},

	setSelected: function(selected, _point) {
		var path = this._path,
			selected = !!selected, // convert to boolean
			state = this._selectionState,
			oldState = state,
			flag = !_point ? 7
					: _point === this._point ? 4
					: _point === this._handleIn ? 1
					: _point === this._handleOut ? 2
					: 0;
		if (selected) {
			state |= flag;
		} else {
			state &= ~flag;
		}
		// Set the selection state even if path is not defined yet, to allow
		// selected segments to be inserted into paths and make JSON
		// deserialization work.
		this._selectionState = state;
		// If the selection state of the segment has changed, we need to let
		// it's path know and possibly add or remove it from
		// project._selectedItems
		if (path && state !== oldState) {
			path._updateSelection(this, oldState, state);
			// Let path know that we changed something and the view should be
			// redrawn
			path._changed(129);
		}
	},

	/**
	 * {@grouptitle Hierarchy}
	 *
	 * The index of the segment in the {@link Path#segments} array that the
	 * segment belongs to.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._index !== undefined ? this._index : null;
	},

	/**
	 * The path that the segment belongs to.
	 *
	 * @type Path
	 * @bean
	 */
	getPath: function() {
		return this._path || null;
	},

	/**
	 * The curve that the segment belongs to. For the last segment of an open
	 * path, the previous segment is returned.
	 *
	 * @type Curve
	 * @bean
	 */
	getCurve: function() {
		var path = this._path,
			index = this._index;
		if (path) {
			// The last segment of an open path belongs to the last curve.
			if (index > 0 && !path._closed
					&& index === path._segments.length - 1)
				index--;
			return path.getCurves()[index] || null;
		}
		return null;
	},

	/**
	 * The curve location that describes this segment's position ont the path.
	 *
	 * @type CurveLocation
	 * @bean
	 */
	getLocation: function() {
		var curve = this.getCurve();
		return curve
				// Determine whether the parameter for this segment is 0 or 1.
				? new CurveLocation(curve, this === curve._segment1 ? 0 : 1)
				: null;
	},

	/**
	 * {@grouptitle Sibling Segments}
	 *
	 * The next segment in the {@link Path#segments} array that the segment
	 * belongs to. If the segments belongs to a closed path, the first segment
	 * is returned for the last segment of the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getNext: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index + 1]
				|| this._path._closed && segments[0]) || null;
	},

	/**
	 * The previous segment in the {@link Path#segments} array that the
	 * segment belongs to. If the segments belongs to a closed path, the last
	 * segment is returned for the first segment of the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getPrevious: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index - 1]
				|| this._path._closed && segments[segments.length - 1]) || null;
	},

	/**
	 * Checks if the this is the first segment in the {@link Path#segments}
	 * array.
	 *
	 * @return {Boolean} {@true if this is the first segment}
	 */
	isFirst: function() {
		return this._index === 0;
	},

	/**
	 * Checks if the this is the last segment in the {@link Path#segments}
	 * array.
	 *
	 * @return {Boolean} {@true if this is the last segment}
	 */
	isLast: function() {
		var path = this._path;
		return path && this._index === path._segments.length - 1 || false;
	},

	/**
	 * Reverses the {@link #handleIn} and {@link #handleOut} vectors of this
	 * segment. Note: the actual segment is modified, no copy is created.
	 * @return {Segment} the reversed segment
	 */
	reverse: function() {
		var handleIn = this._handleIn,
			handleOut = this._handleOut,
			inX = handleIn._x,
			inY = handleIn._y;
		handleIn.set(handleOut._x, handleOut._y);
		handleOut.set(inX, inY);
	},

	/**
	 * Returns the reversed the segment, without modifying the segment itself.
	 * @return {Segment} the reversed segment
	 */
	reversed: function() {
		return new Segment(this._point, this._handleOut, this._handleIn);
	},

	/**
	 * Removes the segment from the path that it belongs to.
	 * @return {Boolean} {@true if the segment was removed}
	 */
	remove: function() {
		return this._path ? !!this._path.removeSegment(this._index) : false;
	},

	clone: function() {
		return new Segment(this._point, this._handleIn, this._handleOut);
	},

	equals: function(segment) {
		return segment === this || segment && this._class === segment._class
				&& this._point.equals(segment._point)
				&& this._handleIn.equals(segment._handleIn)
				&& this._handleOut.equals(segment._handleOut)
				|| false;
	},

	/**
	 * @return {String} a string representation of the segment
	 */
	toString: function() {
		var parts = [ 'point: ' + this._point ];
		if (!this._handleIn.isZero())
			parts.push('handleIn: ' + this._handleIn);
		if (!this._handleOut.isZero())
			parts.push('handleOut: ' + this._handleOut);
		return '{ ' + parts.join(', ') + ' }';
	},

	/**
	 * Transform the segment by the specified matrix.
	 *
	 * @param {Matrix} matrix the matrix to transform the segment by
	 */
	transform: function(matrix) {
		this._transformCoordinates(matrix, new Array(6), true);
		this._changed();
	},

	_transformCoordinates: function(matrix, coords, change) {
		// Use matrix.transform version() that takes arrays of multiple
		// points for largely improved performance, as no calls to
		// Point.read() and Point constructors are necessary.
		var point = this._point,
			// If change is true, only transform handles if they are set, as
			// _transformCoordinates is called only to change the segment, no
			// to receive the coords.
			// This saves some computation time. If change is false, always
			// use the real handles, as we just want to receive a filled
			// coords array for getBounds().
			handleIn = !change || !this._handleIn.isZero()
					? this._handleIn : null,
			handleOut = !change || !this._handleOut.isZero()
					? this._handleOut : null,
			x = point._x,
			y = point._y,
			i = 2;
		coords[0] = x;
		coords[1] = y;
		// We need to convert handles to absolute coordinates in order
		// to transform them.
		if (handleIn) {
			coords[i++] = handleIn._x + x;
			coords[i++] = handleIn._y + y;
		}
		if (handleOut) {
			coords[i++] = handleOut._x + x;
			coords[i++] = handleOut._y + y;
		}
		// If no matrix was previded, this was just called to get the coords and
		// we are done now.
		if (matrix) {
			matrix._transformCoordinates(coords, coords, i / 2);
			x = coords[0];
			y = coords[1];
			if (change) {
				// If change is true, we need to set the new values back
				point._x = x;
				point._y = y;
				i  = 2;
				if (handleIn) {
					handleIn._x = coords[i++] - x;
					handleIn._y = coords[i++] - y;
				}
				if (handleOut) {
					handleOut._x = coords[i++] - x;
					handleOut._y = coords[i++] - y;
				}
			} else {
				// We want to receive the results in coords, so make sure
				// handleIn and out are defined too, even if they're 0
				if (!handleIn) {
					coords[i++] = x;
					coords[i++] = y;
				}
				if (!handleOut) {
					coords[i++] = x;
					coords[i++] = y;
				}
			}
		}
		return coords;
	}
});

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
 * @name SegmentPoint
 * @class An internal version of Point that notifies its segment of each change
 * Note: This prototype is not exported.
 *
 * @private
 */
var SegmentPoint = Point.extend({
	initialize: function SegmentPoint(point, owner, key) {
		var x, y, selected;
		if (!point) {
			x = y = 0;
		} else if ((x = point[0]) !== undefined) { // Array-like
			y = point[1];
		} else {
			// So we don't have to modify the point argument which causes
			// deoptimization:
			var pt = point;
			// If not Point-like already, read Point from arguments
			if ((x = pt.x) === undefined) {
				pt = Point.read(arguments);
				x = pt.x;
			}
			y = pt.y;
			selected = pt.selected;
		}
		this._x = x;
		this._y = y;
		this._owner = owner;
		// We have to set the owner's property that points to this point already
		// now, so #setSelected(true) can work.
		owner[key] = this;
		if (selected)
			this.setSelected(true);
	},

	set: function(x, y) {
		this._x = x;
		this._y = y;
		this._owner._changed(this);
		return this;
	},

	_serialize: function(options) {
		var f = options.formatter,
			x = f.number(this._x),
			y = f.number(this._y);
		return this.isSelected()
				? { x: x, y: y, selected: true }
				: [x, y];
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner._changed(this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner._changed(this);
	},

	isZero: function() {
		// Provide our own version of Point#isZero() that does not use the x / y
		// accessors but the internal properties directly, for performance
		// reasons, since it is used a lot internally.
		return Numerical.isZero(this._x) && Numerical.isZero(this._y);
	},

	setSelected: function(selected) {
		this._owner.setSelected(selected, this);
	},

	isSelected: function() {
		return this._owner.isSelected(this);
	}
});

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
 * @name Curve
 *
 * @class The Curve object represents the parts of a path that are connected by
 * two following {@link Segment} objects. The curves of a path can be accessed
 * through its {@link Path#curves} array.
 *
 * While a segment describe the anchor point and its incoming and outgoing
 * handles, a Curve object describes the curve passing between two such
 * segments. Curves and segments represent two different ways of looking at the
 * same thing, but focusing on different aspects. Curves for example offer many
 * convenient ways to work with parts of the path, finding lengths, positions or
 * tangents at given offsets.
 */
var Curve = Base.extend(/** @lends Curve# */{
	_class: 'Curve',

	/**
	 * Creates a new curve object.
	 *
	 * @name Curve#initialize
	 * @param {Segment} segment1
	 * @param {Segment} segment2
	 */
	/**
	 * Creates a new curve object.
	 *
	 * @name Curve#initialize
	 * @param {Point} point1
	 * @param {Point} handle1
	 * @param {Point} handle2
	 * @param {Point} point2
	 */
	/**
	 * Creates a new curve object.
	 *
	 * @name Curve#initialize
	 * @ignore
	 * @param {Number} x1
	 * @param {Number} y1
	 * @param {Number} handle1x
	 * @param {Number} handle1y
	 * @param {Number} handle2x
	 * @param {Number} handle2y
	 * @param {Number} x2
	 * @param {Number} y2
	 */
	initialize: function Curve(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
		var count = arguments.length,
			seg1, seg2,
			point1, point2,
			handle1, handle2;
		// The following code has to either set seg1 & seg2,
		// or point1, point2, handle1 & handle2. At the end, the internal
		// segments are created accordingly.
		if (count === 3) {
			// Undocumented internal constructor, used by Path#getCurves()
			// new Segment(path, segment1, segment2);
			this._path = arg0;
			seg1 = arg1;
			seg2 = arg2;
		} else if (count === 0) {
			seg1 = new Segment();
			seg2 = new Segment();
		} else if (count === 1) {
			// new Segment(segment);
			// Note: This copies from existing segments through bean getters
			if ('segment1' in arg0) {
				seg1 = new Segment(arg0.segment1);
				seg2 = new Segment(arg0.segment2);
			} else if ('point1' in arg0) {
				// As printed by #toString()
				point1 = arg0.point1;
				handle1 = arg0.handle1;
				handle2 = arg0.handle2;
				point2 = arg0.point2;
			} else if (Array.isArray(arg0)) {
				// Convert getValues() array back to points and handles so we
				// can create segments for those.
				point1 = [arg0[0], arg0[1]];
				point2 = [arg0[6], arg0[7]];
				handle1 = [arg0[2] - arg0[0], arg0[3] - arg0[1]];
				handle2 = [arg0[4] - arg0[6], arg0[5] - arg0[7]];
			}
		} else if (count === 2) {
			// new Segment(segment1, segment2);
			seg1 = new Segment(arg0);
			seg2 = new Segment(arg1);
		} else if (count === 4) {
			point1 = arg0;
			handle1 = arg1;
			handle2 = arg2;
			point2 = arg3;
		} else if (count === 8) {
			// Convert getValues() array from arguments list back to points and
			// handles so we can create segments for those.
			// NOTE: This could be merged with the above code after the array
			// check through the `arguments` object, but it would break JS
			// optimizations.
			point1 = [arg0, arg1];
			point2 = [arg6, arg7];
			handle1 = [arg2 - arg0, arg3 - arg1];
			handle2 = [arg4 - arg6, arg5 - arg7];
		}
		this._segment1 = seg1 || new Segment(point1, null, handle1);
		this._segment2 = seg2 || new Segment(point2, handle2, null);
	},

	_serialize: function(options) {
		// If it has no handles, only serialize points, otherwise handles too.
		return Base.serialize(this.hasHandles()
				? [this.getPoint1(), this.getHandle1(), this.getHandle2(),
					this.getPoint2()]
				: [this.getPoint1(), this.getPoint2()],
				options, true);
	},

	_changed: function() {
		// Clear cached values.
		this._length = this._bounds = undefined;
	},

	/**
	 * Returns a copy of the curve.
	 *
	 * @return {Curve}
	 */
	clone: function() {
		return new Curve(this._segment1, this._segment2);
	},

	/**
	 * @return {String} a string representation of the curve
	 */
	toString: function() {
		var parts = [ 'point1: ' + this._segment1._point ];
		if (!this._segment1._handleOut.isZero())
			parts.push('handle1: ' + this._segment1._handleOut);
		if (!this._segment2._handleIn.isZero())
			parts.push('handle2: ' + this._segment2._handleIn);
		parts.push('point2: ' + this._segment2._point);
		return '{ ' + parts.join(', ') + ' }';
	},

	/**
	 * Removes the curve from the path that it belongs to, by removing its
	 * second segment and merging its handle with the first segment.
	 * @return {Boolean} {@true if the curve was removed}
	 */
	remove: function() {
		var removed = false;
		if (this._path) {
			var segment2 = this._segment2,
				handleOut = segment2._handleOut;
			removed = segment2.remove();
			if (removed)
				this._segment1._handleOut.set(handleOut.x, handleOut.y);
		}
		return removed;
	},

	/**
	 * The first anchor point of the curve.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint1: function() {
		return this._segment1._point;
	},

	setPoint1: function(/* point */) {
		var point = Point.read(arguments);
		this._segment1._point.set(point.x, point.y);
	},

	/**
	 * The second anchor point of the curve.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint2: function() {
		return this._segment2._point;
	},

	setPoint2: function(/* point */) {
		var point = Point.read(arguments);
		this._segment2._point.set(point.x, point.y);
	},

	/**
	 * The handle point that describes the tangent in the first anchor point.
	 *
	 * @type Point
	 * @bean
	 */
	getHandle1: function() {
		return this._segment1._handleOut;
	},

	setHandle1: function(/* point */) {
		var point = Point.read(arguments);
		this._segment1._handleOut.set(point.x, point.y);
	},

	/**
	 * The handle point that describes the tangent in the second anchor point.
	 *
	 * @type Point
	 * @bean
	 */
	getHandle2: function() {
		return this._segment2._handleIn;
	},

	setHandle2: function(/* point */) {
		var point = Point.read(arguments);
		this._segment2._handleIn.set(point.x, point.y);
	},

	/**
	 * The first segment of the curve.
	 *
	 * @type Segment
	 * @bean
	 */
	getSegment1: function() {
		return this._segment1;
	},

	/**
	 * The second segment of the curve.
	 *
	 * @type Segment
	 * @bean
	 */
	getSegment2: function() {
		return this._segment2;
	},

	/**
	 * The path that the curve belongs to.
	 *
	 * @type Path
	 * @bean
	 */
	getPath: function() {
		return this._path;
	},

	/**
	 * The index of the curve in the {@link Path#curves} array.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._segment1._index;
	},

	/**
	 * The next curve in the {@link Path#curves} array that the curve
	 * belongs to.
	 *
	 * @type Curve
	 * @bean
	 */
	getNext: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index + 1]
				|| this._path._closed && curves[0]) || null;
	},

	/**
	 * The previous curve in the {@link Path#curves} array that the curve
	 * belongs to.
	 *
	 * @type Curve
	 * @bean
	 */
	getPrevious: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index - 1]
				|| this._path._closed && curves[curves.length - 1]) || null;
	},

	/**
	 * Checks if the this is the first curve in the {@link Path#curves} array.
	 *
	 * @return {Boolean} {@true if this is the first curve}
	 */
	isFirst: function() {
		return this._segment1._index === 0;
	},

	/**
	 * Checks if the this is the last curve in the {@link Path#curves} array.
	 *
	 * @return {Boolean} {@true if this is the last curve}
	 */
	isLast: function() {
		var path = this._path;
		return path && this._segment1._index === path._curves.length - 1
				|| false;
	},

	/**
	 * Specifies whether the points and handles of the curve are selected.
	 *
	 * @type Boolean
	 * @bean
	 */
	isSelected: function() {
		return this.getPoint1().isSelected()
				&& this.getHandle2().isSelected()
				&& this.getHandle2().isSelected()
				&& this.getPoint2().isSelected();
	},

	setSelected: function(selected) {
		this.getPoint1().setSelected(selected);
		this.getHandle1().setSelected(selected);
		this.getHandle2().setSelected(selected);
		this.getPoint2().setSelected(selected);
	},

	/**
	 * An array of 8 float values, describing this curve's geometry in four
	 * absolute x/y pairs (point1, handle1, handle2, point2). This format is
	 * used internally for efficient processing of curve geometries, e.g. when
	 * calculating intersections or bounds.
	 *
	 * Note that the handles are converted to absolute coordinates.
	 *
	 * @type Number[]
	 * @bean
	 */
	getValues: function(matrix) {
		return Curve.getValues(this._segment1, this._segment2, matrix);
	},

	/**
	 * An array of 4 point objects, describing this curve's geometry in absolute
	 * coordinates (point1, handle1, handle2, point2).
	 *
	 * Note that the handles are converted to absolute coordinates.
	 *
	 * @type Point[]
	 * @bean
	 */
	getPoints: function() {
		// Convert to array of absolute points
		var coords = this.getValues(),
			points = [];
		for (var i = 0; i < 8; i += 2)
			points.push(new Point(coords[i], coords[i + 1]));
		return points;
	},

	/**
	 * The approximated length of the curve.
	 *
	 * @type Number
	 * @bean
	 */
	getLength: function() {
		if (this._length == null)
			this._length = Curve.getLength(this.getValues(), 0, 1);
		return this._length;
	},

	/**
	 * The area that the curve's geometry is covering.
	 *
	 * @type Number
	 * @bean
	 */
	getArea: function() {
		return Curve.getArea(this.getValues());
	},

	/**
	 * @type Line
	 * @bean
	 * @private
	 */
	getLine: function() {
		return new Line(this._segment1._point, this._segment2._point);
	},

	/**
	 * Creates a new curve as a sub-curve from this curve, its range defined by
	 * the given parameters. If {@code from} is larger than {@code to}, then
	 * the resulting curve will have its direction reversed.
	 *
	 * @param {Number} from the curve-time parameter at which the sub-curve
	 * starts
	 * @param {Number} to the curve-time parameter at which the sub-curve
	 * ends
	 * @return {Curve} the newly create sub-curve
	 */
	getPart: function(from, to) {
		return new Curve(Curve.getPart(this.getValues(), from, to));
	},

	// DOCS: Curve#getPartLength(from, to)
	getPartLength: function(from, to) {
		return Curve.getLength(this.getValues(), from, to);
	},

	/**
	 * Returns all intersections between two {@link Curve} objects as an array
	 * of {@link CurveLocation} objects.
	 *
	 * @param {Curve} curve the other curve to find the intersections with (if
	 * the curve itself or {@code null} is passed, the self intersection of the
	 * curve is returned, if it exists)
	 * @return {CurveLocation[]} the locations of all intersections between the
	 * curves
	 */
	getIntersections: function(curve) {
		return Curve._getIntersections(this.getValues(),
				curve && curve !== this ? curve.getValues() : null,
				this, curve, [], {});
	},

	// TODO: adjustThroughPoint

	/**
	 * Private method that handles all types of offset / isParameter pairs and
	 * converts it to a curve parameter.
	 */
	_getParameter: function(offset, isParameter) {
		return isParameter
				? offset
				// Accept CurveLocation objects, and objects that act like
				// them:
				: offset && offset.curve === this
					? offset.parameter
					: offset === undefined && isParameter === undefined
						? 0.5 // default is in the middle
						: this.getParameterAt(offset, 0);
	},

	/**
	 * Divides the curve into two curves at the given offset. The curve itself
	 * is modified and becomes the first part, the second part is returned as a
	 * new curve. If the modified curve belongs to a path item, the second part
	 * is also added to the path.
	 *
	 * @name Curve#divide
	 * @function
	 * @param {Number} [offset=0.5] the offset on the curve at which to split,
	 * or the curve time parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 * is a curve time parameter
	 * @return {Curve} the second part of the divided curve, if the offset
	 * is within the valid range, {code null} otherwise.
	 */
	// TODO: Rename to divideAt()?
	divide: function(offset, isParameter, _setHandles) {
		var parameter = this._getParameter(offset, isParameter),
			tMin = 4e-7,
			tMax = 1 - tMin,
			res = null;
		// Only divide if not at the beginning or end.
		if (parameter >= tMin && parameter <= tMax) {
			var parts = Curve.subdivide(this.getValues(), parameter),
				left = parts[0],
				right = parts[1],
				setHandles = _setHandles || this.hasHandles(),
				segment1 = this._segment1,
				segment2 = this._segment2,
				path = this._path;
			if (setHandles) {
				// Adjust the handles on the existing segments. The new segment
				// will be inserted between the existing segment1 and segment2:
				// Convert absolute -> relative
				segment1._handleOut.set(left[2] - left[0],
						left[3] - left[1]);
				segment2._handleIn.set(right[4] - right[6],
						right[5] - right[7]);
			}
			// Create the new segment:
			var x = left[6], y = left[7],
				segment = new Segment(new Point(x, y),
						setHandles && new Point(left[4] - x, left[5] - y),
						setHandles && new Point(right[2] - x, right[3] - y));
			// Insert it in the segments list, if needed:
			if (path) {
				// By inserting at segment1.index + 1, we make sure to insert at
				// the end if this curve is a closing curve of a closed path,
				// as with segment2.index it would be inserted at 0.
				path.insert(segment1._index + 1, segment);
				// The newly inserted segment is the start of the next curve:
				res = this.getNext();
			} else {
				// otherwise create it from the result of split
				this._segment2 = segment;
				res = new Curve(segment, segment2);
			}
		}
		return res;
	},

	/**
	 * Splits the path this curve belongs to at the given offset. After
	 * splitting, the path will be open. If the path was open already, splitting
	 * will result in two paths.
	 *
	 * @name Curve#split
	 * @function
	 * @param {Number} [offset=0.5] the offset on the curve at which to split,
	 * or the curve time parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 * is a curve time parameter
	 * @return {Path} the newly created path after splitting, if any
	 * @see Path#split(index, parameter)
	 */
	// TODO: Rename to splitAt()?
	split: function(offset, isParameter) {
		return this._path
			? this._path.split(this._segment1._index,
					this._getParameter(offset, isParameter))
			: null;
	},

	/**
	 * Returns a reversed version of the curve, without modifying the curve
	 * itself.
	 *
	 * @return {Curve} a reversed version of the curve
	 */
	reversed: function() {
		return new Curve(this._segment2.reversed(), this._segment1.reversed());
	},

	/**
	 * Clears the curve's handles by setting their coordinates to zero,
	 * turning the curve into a straight line.
	 */
	clearHandles: function() {
		this._segment1._handleOut.set(0, 0);
		this._segment2._handleIn.set(0, 0);
	},

statics: {
	getValues: function(segment1, segment2, matrix) {
		var p1 = segment1._point,
			h1 = segment1._handleOut,
			h2 = segment2._handleIn,
			p2 = segment2._point,
			values = [
				p1._x, p1._y,
				p1._x + h1._x, p1._y + h1._y,
				p2._x + h2._x, p2._y + h2._y,
				p2._x, p2._y
			];
		if (matrix)
			matrix._transformCoordinates(values, values, 4);
		return values;
	},

	subdivide: function(v, t) {
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7];
		if (t === undefined)
			t = 0.5;
		// Triangle computation, with loops unrolled.
		var u = 1 - t,
			// Interpolate from 4 to 3 points
			p3x = u * p1x + t * c1x, p3y = u * p1y + t * c1y,
			p4x = u * c1x + t * c2x, p4y = u * c1y + t * c2y,
			p5x = u * c2x + t * p2x, p5y = u * c2y + t * p2y,
			// Interpolate from 3 to 2 points
			p6x = u * p3x + t * p4x, p6y = u * p3y + t * p4y,
			p7x = u * p4x + t * p5x, p7y = u * p4y + t * p5y,
			// Interpolate from 2 points to 1 point
			p8x = u * p6x + t * p7x, p8y = u * p6y + t * p7y;
		// We now have all the values we need to build the sub-curves:
		return [
			[p1x, p1y, p3x, p3y, p6x, p6y, p8x, p8y], // left
			[p8x, p8y, p7x, p7y, p5x, p5y, p2x, p2y] // right
		];
	},

	// Converts from the point coordinates (p1, c1, c2, p2) for one axis to
	// the polynomial coefficients and solves the polynomial for val
	solveCubic: function (v, coord, val, roots, min, max) {
		var p1 = v[coord],
			c1 = v[coord + 2],
			c2 = v[coord + 4],
			p2 = v[coord + 6],
			c = 3 * (c1 - p1),
			b = 3 * (c2 - c1) - c,
			a = p2 - p1 - c - b;
		return Numerical.solveCubic(a, b, c, p1 - val, roots, min, max);
	},

	getParameterOf: function(v, point) {
		// Before solving cubics, compare the beginning and end of the curve
		// with zero epsilon:
		var p1 = new Point(v[0], v[1]),
			p2 = new Point(v[6], v[7]),
			epsilon = 1e-12,
			t = point.isClose(p1, epsilon) ? 0
			  : point.isClose(p2, epsilon) ? 1
			  : null;
		if (t !== null)
			return t;
		// Solve the cubic for both x- and y-coordinates and consider all found
		// solutions, testing with the larger / looser geometric epsilon.
		var coords = [point.x, point.y],
			roots = [],
			geomEpsilon = 2e-7;
		for (var c = 0; c < 2; c++) {
			var count = Curve.solveCubic(v, c, coords[c], roots, 0, 1);
			for (var i = 0; i < count; i++) {
				t = roots[i];
				if (point.isClose(Curve.getPoint(v, t), geomEpsilon))
					return t;
			}
		}
		// For very short curves (length ~ 1e-13), the above code will not
		// necessarily produce any valid roots. As a fall-back, just check the
		// beginnings and ends at the end so we can still return a valid result.
		return point.isClose(p1, geomEpsilon) ? 0
			 : point.isClose(p2, geomEpsilon) ? 1
			 : null;
	},

	getNearestParameter: function(v, point) {
		if (Curve.isStraight(v)) {
			var p1x = v[0], p1y = v[1],
				p2x = v[6], p2y = v[7],
				vx = p2x - p1x, vy = p2y - p1y,
				det = vx * vx + vy * vy;
			// Avoid divisions by zero.
			if (det === 0)
				return 0;
			// Project the point onto the line and calculate its linear
			// parameter u along the line: u = (point - p1).dot(v) / v.dot(v)
			var u = ((point.x - p1x) * vx + (point.y - p1y) * vy) / det;
			return u < 1e-12 ? 0
				 : u > 0.999999999999 ? 1
				 : Curve.getParameterOf(v,
					new Point(p1x + u * vx, p1y + u * vy));
		}

		var count = 100,
			minDist = Infinity,
			minT = 0;

		function refine(t) {
			if (t >= 0 && t <= 1) {
				var dist = point.getDistance(Curve.getPoint(v, t), true);
				if (dist < minDist) {
					minDist = dist;
					minT = t;
					return true;
				}
			}
		}

		for (var i = 0; i <= count; i++)
			refine(i / count);

		// Now iteratively refine solution until we reach desired precision.
		var step = 1 / (count * 2);
		while (step > 4e-7) {
			if (!refine(minT - step) && !refine(minT + step))
				step /= 2;
		}
		return minT;
	},

	// TODO: Find better name
	getPart: function(v, from, to) {
		var flip = from > to;
		if (flip) {
			var tmp = from;
			from = to;
			to = tmp;
		}
		if (from > 0)
			v = Curve.subdivide(v, from)[1]; // [1] right
		// Interpolate the parameter at 'to' in the new curve and cut there.
		if (to < 1)
			v = Curve.subdivide(v, (to - from) / (1 - from))[0]; // [0] left
		// Return reversed curve if from / to were flipped:
		return flip
				? [v[6], v[7], v[4], v[5], v[2], v[3], v[0], v[1]]
				: v;
	},

	hasHandles: function(v) {
		var isZero = Numerical.isZero;
		return !(isZero(v[0] - v[2]) && isZero(v[1] - v[3])
				&& isZero(v[4] - v[6]) && isZero(v[5] - v[7]));
	},

	isFlatEnough: function(v, tolerance) {
		// Thanks to Kaspar Fischer and Roger Willcocks for the following:
		// http://hcklbrrfnn.files.wordpress.com/2012/08/bez.pdf
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],
			ux = 3 * c1x - 2 * p1x - p2x,
			uy = 3 * c1y - 2 * p1y - p2y,
			vx = 3 * c2x - 2 * p2x - p1x,
			vy = 3 * c2y - 2 * p2y - p1y;
		return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy)
				< 10 * tolerance * tolerance;
	},

	getArea: function(v) {
		// This is a combination of the methods to decide if a path is clockwise
		// and to calculate the area, as described here:
		// http://objectmix.com/graphics/133553-area-closed-bezier-curve.html
		// http://stackoverflow.com/questions/1165647
		// We treat the curve points and handles as the outline of a polygon of
		// which we determine the orientation using the method of calculating
		// the sum over the edges. This will work even with non-convex polygons,
		// telling you whether it's mostly clockwise.
		// With bezier curves, the trick appears to be to calculate edge sum
		// with half the handles' lengths, and then:
		// area = 6 * edge-sum / 10
		var p1x = v[0], p1y = v[1],
			p2x = v[6], p2y = v[7],
			h1x = (v[2] + p1x) / 2,
			h1y = (v[3] + p1y) / 2,
			h2x = (v[4] + v[6]) / 2,
			h2y = (v[5] + v[7]) / 2;
		return 6 * ((p1x - h1x) * (h1y + p1y)
				  + (h1x - h2x) * (h2y + h1y)
				  + (h2x - p2x) * (p2y + h2y)) / 10;
	},

	getBounds: function(v) {
		var min = v.slice(0, 2), // Start with values of point1
			max = min.slice(), // clone
			roots = [0, 0];
		for (var i = 0; i < 2; i++)
			Curve._addBounds(v[i], v[i + 2], v[i + 4], v[i + 6],
					i, 0, min, max, roots);
		return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
	},

	/**
	 * Private helper for both Curve.getBounds() and Path.getBounds(), which
	 * finds the 0-crossings of the derivative of a bezier curve polynomial, to
	 * determine potential extremas when finding the bounds of a curve.
	 * Note: padding is only used for Path.getBounds().
	 */
	_addBounds: function(v0, v1, v2, v3, coord, padding, min, max, roots) {
		// Code ported and further optimised from:
		// http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
		function add(value, padding) {
			var left = value - padding,
				right = value + padding;
			if (left < min[coord])
				min[coord] = left;
			if (right > max[coord])
				max[coord] = right;
		}
		// Calculate derivative of our bezier polynomial, divided by 3.
		// Doing so allows for simpler calculations of a, b, c and leads to the
		// same quadratic roots.
		var a = 3 * (v1 - v2) - v0 + v3,
			b = 2 * (v0 + v2) - 4 * v1,
			c = v1 - v0,
			count = Numerical.solveQuadratic(a, b, c, roots),
			// Add some tolerance for good roots, as t = 0, 1 are added
			// separately anyhow, and we don't want joins to be added with radii
			// in getStrokeBounds()
			tMin = 4e-7,
			tMax = 1 - tMin;
		// Only add strokeWidth to bounds for points which lie	within 0 < t < 1
		// The corner cases for cap and join are handled in getStrokeBounds()
		add(v3, 0);
		for (var i = 0; i < count; i++) {
			var t = roots[i],
				u = 1 - t;
			// Test for good roots and only add to bounds if good.
			if (tMin < t && t < tMax)
				// Calculate bezier polynomial at t.
				add(u * u * u * v0
					+ 3 * u * u * t * v1
					+ 3 * u * t * t * v2
					+ t * t * t * v3,
					padding);
		}
	}
}}, Base.each(
	['getBounds', 'getStrokeBounds', 'getHandleBounds', 'getRoughBounds'],
	// Note: Although Curve.getBounds() exists, we are using Path.getBounds() to
	// determine the bounds of Curve objects with defined segment1 and segment2
	// values Curve.getBounds() can be used directly on curve arrays, without
	// the need to create a Curve object first, as required by the code that
	// finds path interesections.
	function(name) {
		this[name] = function() {
			if (!this._bounds)
				this._bounds = {};
			var bounds = this._bounds[name];
			if (!bounds) {
				// Calculate the curve bounds by passing a segment list for the
				// curve to the static Path.get*Boudns methods.
				var path = this._path;
				bounds = this._bounds[name] = Path[name](
						[this._segment1, this._segment2], false,
						path && path.getStyle());
			}
			return bounds.clone();
		};
	},
/** @lends Curve# */{
	/**
	 * {@grouptitle Bounding Boxes}
	 *
	 * The bounding rectangle of the curve excluding stroke width.
	 *
	 * @name Curve#bounds
	 * @type Rectangle
	 */

	/**
	 * The bounding rectangle of the curve including stroke width.
	 *
	 * @name Curve#strokeBounds
	 * @type Rectangle
	 */

	/**
	 * The bounding rectangle of the curve including handles.
	 *
	 * @name Curve#handleBounds
	 * @type Rectangle
	 */

	/**
	 * The rough bounding rectangle of the curve that is shure to include all of
	 * the drawing, including stroke width.
	 *
	 * @name Curve#roughBounds
	 * @type Rectangle
	 * @ignore
	 */
}), Base.each({ // Injection scope for tests both as instance and static methods
	isStraight: function(l, h1, h2) {
		if (h1.isZero() && h2.isZero()) {
			// No handles.
			return true;
		} else if (l.isZero()) {
			// Zero-length line, with some handles defined.
			return false;
		} else if (h1.isCollinear(l) && h2.isCollinear(l)) {
			// Collinear handles. Project them onto line to see if they are
			// within the line's range:
			var div = l.dot(l),
				p1 = l.dot(h1) / div,
				p2 = l.dot(h2) / div;
			return p1 >= 0 && p1 <= 1 && p2 <= 0 && p2 >= -1;
		}
		return false;
	},

	isLinear: function(l, h1, h2) {
		var third = l.divide(3);
		return h1.equals(third) && h2.negate().equals(third);
	}
}, function(test, name) {
	// Produce the instance version that is called on curve object.
	this[name] = function() {
		var seg1 = this._segment1,
			seg2 = this._segment2;
		return test(seg2._point.subtract(seg1._point),
				seg1._handleOut, seg2._handleIn);
	};

	// Produce the static version that handles a curve values array.
	this.statics[name] = function(v) {
		var p1x = v[0], p1y = v[1],
			p2x = v[6], p2y = v[7];
		return test(new Point(p2x - p1x, p2y - p1y),
				new Point(v[2] - p1x, v[3] - p1y),
				new Point(v[4] - p2x, v[5] - p2y));
	};
}, /** @lends Curve# */{
	statics: {}, // Filled in the Base.each loop above.

	/**
	 * {@grouptitle Curve Tests}
	 *
	 * Checks if this curve has any curve handles set.
	 *
	 * @return {Boolean} {@true if the curve has handles set}
	 * @see Curve#handle1
	 * @see Curve#handle2
	 * @see Segment#hasHandles()
	 * @see Path#hasHandles()
	 */
	hasHandles: function() {
		return !this._segment1._handleOut.isZero()
				|| !this._segment2._handleIn.isZero();
	},

	/**
	 * Checks if this curve appears as a straight line. This can mean that
	 * it has no handles defined, or that the handles run collinear with the
	 * line that connects the curve's start and end point, not falling
	 * outside of the line.
	 *
	 * @name Curve#isStraight
	 * @function
	 * @return {Boolean} {@true if the curve is straight}
	 */

	/**
	 * Checks if this curve is parametrically linear, meaning that it is
	 * straight and its handles are positioned at 1/3 and 2/3 of the total
	 * length of the curve.
	 *
	 * @name Curve#isLinear
	 * @function
	 * @return {Boolean} {@true if the curve is parametrically linear}
	 */

	/**
	 * Checks if the the two curves describe straight lines that are
	 * collinear, meaning they run in parallel.
	 *
	 * @param {Curve} curve the other curve to check against
	 * @return {Boolean} {@true if the two lines are collinear}
	 */
	isCollinear: function(curve) {
		return curve && this.isStraight() && curve.isStraight()
				&& this.getLine().isCollinear(curve.getLine());
	},

	/**
	 * Checks if the curve is a straight horizontal line.
	 *
	 * @return {Boolean} {@true if the line is horizontal}
	 */
	isHorizontal: function() {
		return this.isStraight() && Math.abs(this.getTangentAt(0.5, true).y)
				< 1e-7;
	},

	/**
	 * Checks if the curve is a straight vertical line.
	 *
	 * @return {Boolean} {@true if the line is vertical}
	 */
	isVertical: function() {
		return this.isStraight() && Math.abs(this.getTangentAt(0.5, true).x)
				< 1e-7;
	}
}), /** @lends Curve# */{
	// Explicitly deactivate the creation of beans, as we have functions here
	// that look like bean getters but actually read arguments.
	// See #getParameterOf(), #getLocationOf(), #getNearestLocation(), ...
	beans: false,

	/**
	 * {@grouptitle Positions on Curves}
	 *
	 * Calculates the curve time parameter of the specified offset on the path,
	 * relative to the provided start parameter. If offset is a negative value,
	 * the parameter is searched to the left of the start parameter. If no start
	 * parameter is provided, a default of {@code 0} for positive values of
	 * {@code offset} and {@code 1} for negative values of {@code offset}.
	 *
	 * @param {Number} offset
	 * @param {Number} [start]
	 * @return {Number} the curve time parameter at the specified offset
	 */
	getParameterAt: function(offset, start) {
		return Curve.getParameterAt(this.getValues(), offset, start);
	},

	/**
	 * Returns the curve time parameter of the specified point if it lies on the
	 * curve, {@code null} otherwise.
	 *
	 * @param {Point} point the point on the curve
	 * @return {Number} the curve time parameter of the specified point
	 */
	getParameterOf: function(/* point */) {
		return Curve.getParameterOf(this.getValues(), Point.read(arguments));
	},

	/**
	 * Calculates the curve location at the specified offset or curve time
	 * parameter.
	 *
	 * @param {Number} offset the offset on the curve, or the curve time
	 * parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 * is a curve time parameter
	 * @return {CurveLocation} the curve location at the specified the offset
	 */
	getLocationAt: function(offset, isParameter) {
		var t = isParameter ? offset : this.getParameterAt(offset);
		return t != null && t >= 0 && t <= 1
				? new CurveLocation(this, t)
				: null;
	},

	/**
	 * Returns the curve location of the specified point if it lies on the
	 * curve, {@code null} otherwise.
	 *
	 * @param {Point} point the point on the curve
	 * @return {CurveLocation} the curve location of the specified point
	 */
	getLocationOf: function(/* point */) {
		return this.getLocationAt(this.getParameterOf(Point.read(arguments)),
				true);
	},

	/**
	 * Returns the length of the path from its beginning up to up to the
	 * specified point if it lies on the path, {@code null} otherwise.
	 *
	 * @param {Point} point the point on the path
	 * @return {Number} the length of the path up to the specified point
	 */
	getOffsetOf: function(/* point */) {
		var loc = this.getLocationOf.apply(this, arguments);
		return loc ? loc.getOffset() : null;
	},

	/**
	 * Returns the nearest location on the curve to the specified point.
	 *
	 * @function
	 * @param {Point} point the point for which we search the nearest location
	 * @return {CurveLocation} the location on the curve that's the closest to
	 * the specified point
	 */
	getNearestLocation: function(/* point */) {
		var point = Point.read(arguments),
			values = this.getValues(),
			t = Curve.getNearestParameter(values, point),
			pt = Curve.getPoint(values, t);
		return new CurveLocation(this, t, pt, null, point.getDistance(pt));
	},

	/**
	 * Returns the nearest point on the curve to the specified point.
	 *
	 * @function
	 * @param {Point} point the point for which we search the nearest point
	 * @return {Point} the point on the curve that's the closest to the
	 * specified point
	 */
	getNearestPoint: function(/* point */) {
		return this.getNearestLocation.apply(this, arguments).getPoint();
	}

	/**
	 * Calculates the point on the curve at the given offset.
	 *
	 * @name Curve#getPointAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 * parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 * is a curve time parameter
	 * @return {Point} the point on the curve at the given offset
	 */

	/**
	 * Calculates the normalized tangent vector of the curve at the given
	 * offset.
	 *
	 * @name Curve#getTangentAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 * parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 * is a curve time parameter
	 * @return {Point} the normalized tangent of the curve at the given offset
	 */

	/**
	 * Calculates the normal vector of the curve at the given offset.
	 *
	 * @name Curve#getNormalAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 * parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 * is a curve time parameter
	 * @return {Point} the normal of the curve at the given offset
	 */

	/**
	 * Calculates the weighted tangent vector of the curve at the given
	 * offset, its length reflecting the curve velocity at that location.
	 *
	 * @name Curve#getWeightedTangentAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 * parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 * is a curve time parameter
	 * @return {Point} the weighted tangent of the curve at the given offset
	 */

	/**
	 * Calculates the weighted normal vector of the curve at the given offset,
	 * its length reflecting the curve velocity at that location.
	 *
	 * @name Curve#getWeightedNormalAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 * parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 * is a curve time parameter
	 * @return {Point} the weighted normal of the curve at the given offset
	 */

	/**
	 * Calculates the curvature of the curve at the given offset. Curvatures
	 * indicate how sharply a curve changes direction. A straight line has zero
	 * curvature, where as a circle has a constant curvature. The curve's radius
	 * at the given offset is the reciprocal value of its curvature.
	 *
	 * @name Curve#getCurvatureAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 * parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 * is a curve time parameter
	 * @return {Number} the curvature of the curve at the given offset
	 */
},
new function() { // // Scope to inject various curve evaluation methods
	var methods = ['getPoint', 'getTangent', 'getNormal', 'getWeightedTangent',
		'getWeightedNormal', 'getCurvature'];
	return Base.each(methods,
	// Note: Although Curve.getBounds() exists, we are using Path.getBounds() to
	// determine the bounds of Curve objects with defined segment1 and segment2
	// values Curve.getBounds() can be used directly on curve arrays, without
	// the need to create a Curve object first, as required by the code that
	// finds path intersections.
	function(name) {
		this[name + 'At'] = function(offset, isParameter) {
			var values = this.getValues();
			return Curve[name](values, isParameter ? offset
					: Curve.getParameterAt(values, offset, 0));
		};
	}, {
		statics: {
			evaluateMethods: methods
		}
	})
},
new function() { // Scope for methods that require private functions

	function getLengthIntegrand(v) {
		// Calculate the coefficients of a Bezier derivative.
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],

			ax = 9 * (c1x - c2x) + 3 * (p2x - p1x),
			bx = 6 * (p1x + c2x) - 12 * c1x,
			cx = 3 * (c1x - p1x),

			ay = 9 * (c1y - c2y) + 3 * (p2y - p1y),
			by = 6 * (p1y + c2y) - 12 * c1y,
			cy = 3 * (c1y - p1y);

		return function(t) {
			// Calculate quadratic equations of derivatives for x and y
			var dx = (ax * t + bx) * t + cx,
				dy = (ay * t + by) * t + cy;
			return Math.sqrt(dx * dx + dy * dy);
		};
	}

	// Amount of integral evaluations for the interval 0 <= a < b <= 1
	function getIterations(a, b) {
		// Guess required precision based and size of range...
		// TODO: There should be much better educated guesses for
		// this. Also, what does this depend on? Required precision?
		return Math.max(2, Math.min(16, Math.ceil(Math.abs(b - a) * 32)));
	}

	function evaluate(v, t, type, normalized) {
		// Do not produce results if parameter is out of range or invalid.
		if (t == null || t < 0 || t > 1)
			return null;
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],
			tMin = 4e-7,
			tMax = 1 - tMin,
			x, y;

		// Handle special case at beginning / end of curve
		if (type === 0 && (t < tMin || t > tMax)) {
			var isZero = t < tMin;
			x = isZero ? p1x : p2x;
			y = isZero ? p1y : p2y;
		} else {
			// Calculate the polynomial coefficients.
			var cx = 3 * (c1x - p1x),
				bx = 3 * (c2x - c1x) - cx,
				ax = p2x - p1x - cx - bx,

				cy = 3 * (c1y - p1y),
				by = 3 * (c2y - c1y) - cy,
				ay = p2y - p1y - cy - by;
			if (type === 0) {
				// Calculate the curve point at parameter value t
				x = ((ax * t + bx) * t + cx) * t + p1x;
				y = ((ay * t + by) * t + cy) * t + p1y;
			} else {
				// 1: tangent, 1st derivative
				// 2: normal, 1st derivative
				// 3: curvature, 1st derivative & 2nd derivative
				// Simply use the derivation of the bezier function for both
				// the x and y coordinates:
				// Prevent tangents and normals of length 0:
				// http://stackoverflow.com/questions/10506868/
				if (t < tMin) {
					x = cx;
					y = cy;
				} else if (t > tMax) {
					x = 3 * (p2x - c2x);
					y = 3 * (p2y - c2y);
				} else {
					x = (3 * ax * t + 2 * bx) * t + cx;
					y = (3 * ay * t + 2 * by) * t + cy;
				}
				if (normalized) {
					// When the tangent at t is zero and we're at the beginning
					// or the end, we can use the vector between the handles,
					// but only when normalizing as its weighted length is 0.
					if (x === 0 && y === 0 && (t < tMin || t > tMax)) {
						x = c2x - c1x;
						y = c2y - c1y;
					}
					// Now normalize x & y
					var len = Math.sqrt(x * x + y * y);
					if (len) {
						x /= len;
						y /= len;
					}
				}
				if (type === 3) {
					// Calculate 2nd derivative, and curvature from there:
					// http://cagd.cs.byu.edu/~557/text/ch2.pdf page#31
					// k = |dx * d2y - dy * d2x| / (( dx^2 + dy^2 )^(3/2))
					var x2 = 6 * ax * t + 2 * bx,
						y2 = 6 * ay * t + 2 * by,
						d = Math.pow(x * x + y * y, 3 / 2);
					// For JS optimizations we always return a Point, although
					// curvature is just a numeric value, stored in x:
					x = d !== 0 ? (x * y2 - y * x2) / d : 0;
					y = 0;
				}
			}
		}
		// The normal is simply the rotated tangent:
		return type === 2 ? new Point(y, -x) : new Point(x, y);
	}

	return { statics: {

		getLength: function(v, a, b) {
			if (a === undefined)
				a = 0;
			if (b === undefined)
				b = 1;
			if (a === 0 && b === 1 && Curve.isStraight(v)) {
				// The length of straight curves can be calculated more easily.
				var dx = v[6] - v[0], // p2x - p1x
					dy = v[7] - v[1]; // p2y - p1y
				return Math.sqrt(dx * dx + dy * dy);
			}
			var ds = getLengthIntegrand(v);
			return Numerical.integrate(ds, a, b, getIterations(a, b));
		},

		getParameterAt: function(v, offset, start) {
			if (start === undefined)
				start = offset < 0 ? 1 : 0
			if (offset === 0)
				return start;
			// See if we're going forward or backward, and handle cases
			// differently
			var abs = Math.abs,
				forward = offset > 0,
				a = forward ? start : 0,
				b = forward ? 1 : start,
				// Use integrand to calculate both range length and part
				// lengths in f(t) below.
				ds = getLengthIntegrand(v),
				// Get length of total range
				rangeLength = Numerical.integrate(ds, a, b,
						getIterations(a, b));
			if (abs(offset - rangeLength) < 1e-12) {
				// Matched the end:
				return forward ? b : a;
			} else if (abs(offset) > rangeLength) {
				// We're out of bounds.
				return null;
			}
			// Use offset / rangeLength for an initial guess for t, to
			// bring us closer:
			var guess = offset / rangeLength,
				length = 0;
			// Iteratively calculate curve range lengths, and add them up,
			// using integration precision depending on the size of the
			// range. This is much faster and also more precise than not
			// modifying start and calculating total length each time.
			function f(t) {
				// When start > t, the integration returns a negative value.
				length += Numerical.integrate(ds, start, t,
						getIterations(start, t));
				start = t;
				return length - offset;
			}
			// Start with out initial guess for x.
			// NOTE: guess is a negative value when not looking forward.
			return Numerical.findRoot(f, ds, start + guess, a, b, 32,
					1e-12);
		},

		getPoint: function(v, t) {
			return evaluate(v, t, 0, false);
		},

		getTangent: function(v, t) {
			return evaluate(v, t, 1, true);
		},

		getWeightedTangent: function(v, t) {
			return evaluate(v, t, 1, false);
		},

		getNormal: function(v, t) {
			return evaluate(v, t, 2, true);
		},

		getWeightedNormal: function(v, t) {
			return evaluate(v, t, 2, false);
		},

		getCurvature: function(v, t) {
			return evaluate(v, t, 3, false).x;
		}
	}};
},
new function() { // Scope for intersection using bezier fat-line clipping

	function addLocation(locations, param, v1, c1, t1, p1, v2, c2, t2, p2,
			overlap) {
		var startConnected = param.startConnected,
			endConnected = param.endConnected,
			tMin = 4e-7,
			tMax = 1 - tMin;
		if (t1 == null)
			t1 = Curve.getParameterOf(v1, p1);
		// Check t1 and t2 against correct bounds, based on start-/endConnected:
		// - startConnected means the start of c1 connects to the end of c2
		// - endConneted means the end of c1 connects to the start of c2
		// - If either c1 or c2 are at the end of the path, exclude their end,
		//	 which connects back to the beginning, but only if it's not part of
		//	 a found overlap. The normal intersection will already be found at
		//	 the beginning, and would be added twice otherwise.
		if (t1 !== null && t1 >= (startConnected ? tMin : 0) &&
			t1 <= (endConnected ? tMax : 1)) {
			if (t2 == null)
				t2 = Curve.getParameterOf(v2, p2);
			if (t2 !== null && t2 >= (endConnected ? tMin : 0) &&
				t2 <= (startConnected ? tMax : 1)) {
				var renormalize = param.renormalize;
				if (renormalize) {
					var res = renormalize(t1, t2);
					t1 = res[0];
					t2 = res[1];
				}
				var loc1 = new CurveLocation(c1, t1,
						p1 || Curve.getPoint(v1, t1), overlap),
					loc2 = new CurveLocation(c2, t2,
						p2 || Curve.getPoint(v2, t2), overlap),
					// For self-intersections, detect the case where the second
					// curve wrapped around, and flip them so they can get
					// matched to a potentially already existing intersection.
					flip = loc1.getPath() === loc2.getPath()
						&& loc1.getIndex() > loc2.getIndex(),
					loc = flip ? loc2 : loc1,
					include = param.include;
				// Link the two locations to each other.
				loc1._intersection = loc2;
				loc2._intersection = loc1;
				if (!include || include(loc)) {
					CurveLocation.insert(locations, loc, true);
				}
			}
		}
	}

	function addCurveIntersections(v1, v2, c1, c2, locations, param,
			tMin, tMax, uMin, uMax, oldTDiff, reverse, recursion) {
		// Avoid deeper recursion.
		// NOTE: @iconexperience determined that more than 20 recursions are
		// needed sometimes, depending on the tDiff threshold values further
		// below when determining which curve converges the least. He also
		// recommended a threshold of 0.5 instead of the initial 0.8
		// See: https://github.com/paperjs/paper.js/issues/565
		if (++recursion >= 24)
			return;
		// Let P be the first curve and Q be the second
		var q0x = v2[0], q0y = v2[1], q3x = v2[6], q3y = v2[7],
			getSignedDistance = Line.getSignedDistance,
			// Calculate the fat-line L for Q is the baseline l and two
			// offsets which completely encloses the curve P.
			d1 = getSignedDistance(q0x, q0y, q3x, q3y, v2[2], v2[3]),
			d2 = getSignedDistance(q0x, q0y, q3x, q3y, v2[4], v2[5]),
			factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9,
			dMin = factor * Math.min(0, d1, d2),
			dMax = factor * Math.max(0, d1, d2),
			// Calculate non-parametric bezier curve D(ti, di(t)) - di(t) is the
			// distance of P from the baseline l of the fat-line, ti is equally
			// spaced in [0, 1]
			dp0 = getSignedDistance(q0x, q0y, q3x, q3y, v1[0], v1[1]),
			dp1 = getSignedDistance(q0x, q0y, q3x, q3y, v1[2], v1[3]),
			dp2 = getSignedDistance(q0x, q0y, q3x, q3y, v1[4], v1[5]),
			dp3 = getSignedDistance(q0x, q0y, q3x, q3y, v1[6], v1[7]),
			// Get the top and bottom parts of the convex-hull
			hull = getConvexHull(dp0, dp1, dp2, dp3),
			top = hull[0],
			bottom = hull[1],
			tMinClip,
			tMaxClip;
		// Clip the convex-hull with dMin and dMax, taking into account that
		// there will be no intersections if one of the tvalues are null.
		if ((tMinClip = clipConvexHull(top, bottom, dMin, dMax)) == null ||
			(tMaxClip = clipConvexHull(top.reverse(), bottom.reverse(),
				dMin, dMax)) == null)
			return;
		// Clip P with the fat-line for Q
		v1 = Curve.getPart(v1, tMinClip, tMaxClip);
		var tDiff = tMaxClip - tMinClip,
			// tMin and tMax are within the range (0, 1). We need to project it
			// to the original parameter range for v2.
			tMinNew = tMin + (tMax - tMin) * tMinClip,
			tMaxNew = tMin + (tMax - tMin) * tMaxClip;
		// Check if we need to subdivide the curves
		if (oldTDiff > 0.5 && tDiff > 0.5) {
			// Subdivide the curve which has converged the least.
			if (tMaxNew - tMinNew > uMax - uMin) {
				var parts = Curve.subdivide(v1, 0.5),
					t = tMinNew + (tMaxNew - tMinNew) / 2;
				addCurveIntersections(
					v2, parts[0], c2, c1, locations, param,
					uMin, uMax, tMinNew, t, tDiff, !reverse, recursion);
				addCurveIntersections(
					v2, parts[1], c2, c1, locations, param,
					uMin, uMax, t, tMaxNew, tDiff, !reverse, recursion);
			} else {
				var parts = Curve.subdivide(v2, 0.5),
					t = uMin + (uMax - uMin) / 2;
				addCurveIntersections(
					parts[0], v1, c2, c1, locations, param,
					uMin, t, tMinNew, tMaxNew, tDiff, !reverse, recursion);
				addCurveIntersections(
					parts[1], v1, c2, c1, locations, param,
					t, uMax, tMinNew, tMaxNew, tDiff, !reverse, recursion);
			}
		} else if (Math.max(uMax - uMin, tMaxNew - tMinNew)
				< 1e-7) {
			// We have isolated the intersection with sufficient precision
			var t1 = tMinNew + (tMaxNew - tMinNew) / 2,
				t2 = uMin + (uMax - uMin) / 2;
			// Since we've been chopping up v1 and v2, we need to pass on the
			// original full curves here again to match the parameter space of
			// t1 and t2.
			// TODO: Add two more arguments to addCurveIntersections after param
			// to pass on the sub-curves.
			v1 = c1.getValues();
			v2 = c2.getValues();
			addLocation(locations, param,
				reverse ? v2 : v1, reverse ? c2 : c1, reverse ? t2 : t1, null,
				reverse ? v1 : v2, reverse ? c1 : c2, reverse ? t1 : t2, null);
		} else if (tDiff > 1e-12) { // Iterate
			addCurveIntersections(v2, v1, c2, c1, locations, param,
					uMin, uMax, tMinNew, tMaxNew, tDiff, !reverse, recursion);
		}
	}

	/**
	 * Calculate the convex hull for the non-parametric bezier curve D(ti, di(t))
	 * The ti is equally spaced across [0..1] — [0, 1/3, 2/3, 1] for
	 * di(t), [dq0, dq1, dq2, dq3] respectively. In other words our CVs for the
	 * curve are already sorted in the X axis in the increasing order.
	 * Calculating convex-hull is much easier than a set of arbitrary points.
	 *
	 * The convex-hull is returned as two parts [TOP, BOTTOM]:
	 * (both are in a coordinate space where y increases upwards with origin at
	 * bottom-left)
	 * TOP: The part that lies above the 'median' (line connecting end points of
	 * the curve)
	 * BOTTOM: The part that lies below the median.
	 */
	function getConvexHull(dq0, dq1, dq2, dq3) {
		var p0 = [ 0, dq0 ],
			p1 = [ 1 / 3, dq1 ],
			p2 = [ 2 / 3, dq2 ],
			p3 = [ 1, dq3 ],
			// Find vertical signed distance of p1 and p2 from line [p0, p3]
			dist1 = dq1 - (2 * dq0 + dq3) / 3,
			dist2 = dq2 - (dq0 + 2 * dq3) / 3,
			hull;
		// Check if p1 and p2 are on the opposite side of the line [p0, p3]
		if (dist1 * dist2 < 0) {
			// p1 and p2 lie on different sides of [p0, p3]. The hull is a
			// quadrilateral and line [p0, p3] is NOT part of the hull so we are
			// pretty much done here. The top part includes p1, we will reverse
			// it later if that is not the case.
			hull = [[p0, p1, p3], [p0, p2, p3]];
		} else {
			// p1 and p2 lie on the same sides of [p0, p3]. The hull can be a
			// triangle or a quadrilateral and line [p0, p3] is part of the
			// hull. Check if the hull is a triangle or a quadrilateral. We have
			// a triangle if the vertical distance of one of the middle points
			// (p1, p2) is equal or less than half the vertical distance of the
			// other middle point.
			var distRatio = dist1 / dist2;
			hull = [
				// p2 is inside, the hull is a triangle.
				distRatio >= 2 ? [p0, p1, p3]
				// p1 is inside, the hull is a triangle.
				: distRatio <= .5 ? [p0, p2, p3]
				// Hull is a quadrilateral, we need all lines in correct order.
				: [p0, p1, p2, p3],
				// Line [p0, p3] is part of the hull.
				[p0, p3]
			];
		}
		// Flip hull if dist1 is negative or if it is zero and dist2 is negative
		return (dist1 || dist2) < 0 ? hull.reverse() : hull;
	}

	/**
	 * Clips the convex-hull and returns [tMin, tMax] for the curve contained.
	 */
	function clipConvexHull(hullTop, hullBottom, dMin, dMax) {
		if (hullTop[0][1] < dMin) {
			// Left of hull is below dMin, walk through the hull until it
			// enters the region between dMin and dMax
			return clipConvexHullPart(hullTop, true, dMin);
		} else if (hullBottom[0][1] > dMax) {
			// Left of hull is above dMax, walk through the hull until it
			// enters the region between dMin and dMax
			return clipConvexHullPart(hullBottom, false, dMax);
		} else {
			// Left of hull is between dMin and dMax, no clipping possible
			return hullTop[0][0];
		}
	}

	function clipConvexHullPart(part, top, threshold) {
		var px = part[0][0],
			py = part[0][1];
		for (var i = 1, l = part.length; i < l; i++) {
			var qx = part[i][0],
				qy = part[i][1];
			if (top ? qy >= threshold : qy <= threshold) {
				return qy === threshold ? qx
						: px + (threshold - py) * (qx - px) / (qy - py);
			}
			px = qx;
			py = qy;
		}
		// All points of hull are above / below the threshold
		return null;
	}

	/**
	 * Intersections between curve and line becomes rather simple here mostly
	 * because of Numerical class. We can rotate the curve and line so that the
	 * line is on the X axis, and solve the implicit equations for the X axis
	 * and the curve.
	 */
	function addCurveLineIntersections(v1, v2, c1, c2, locations, param) {
		var flip = Curve.isStraight(v1),
			vc = flip ? v2 : v1,
			vl = flip ? v1 : v2,
			lx1 = vl[0], ly1 = vl[1],
			lx2 = vl[6], ly2 = vl[7],
			// Rotate both curve and line around l1 so that line is on x axis.
			ldx = lx2 - lx1,
			ldy = ly2 - ly1,
			// Calculate angle to the x-axis (1, 0).
			angle = Math.atan2(-ldy, ldx),
			sin = Math.sin(angle),
			cos = Math.cos(angle),
			// (rlx1, rly1) = (0, 0)
			// Calculate the curve values of the rotated curve.
			rvc = [];
		for(var i = 0; i < 8; i += 2) {
			var x = vc[i] - lx1,
				y = vc[i + 1] - ly1;
			rvc.push(
				x * cos - y * sin,
				x * sin + y * cos);
		}
		// Solve it for y = 0. We need to include t = 0, 1 and let addLocation()
		// do the filtering, to catch important edge cases.
		var roots = [],
			count = Curve.solveCubic(rvc, 1, 0, roots, 0, 1);
		// NOTE: count could be -1 for infinite solutions, but that should only
		// happen with lines, in which case we should not be here.
		for (var i = 0; i < count; i++) {
			// For each found solution on the rotated curve, get the point on
			// the real curve and with that the location on the line.
			var tc = roots[i],
				pc = Curve.getPoint(vc, tc),
				tl = Curve.getParameterOf(vl, pc);
			if (tl !== null) {
				var pl = Curve.getPoint(vl, tl),
					t1 = flip ? tl : tc,
					t2 = flip ? tc : tl;
				// If the two curves are connected and the 2nd is very short,
				// (l < Numerical.GEOMETRIC_EPSILON), we need to filter out an
				// invalid intersection at the beginning of this short curve.
				if (!param.endConnected || t2 > Numerical.CURVETIME_EPSILON) {
					addLocation(locations, param,
							v1, c1, t1, flip ? pl : pc,
							v2, c2, t2, flip ? pc : pl);
				}
			}
		}
	}

	function addLineIntersection(v1, v2, c1, c2, locations, param) {
		var pt = Line.intersect(
				v1[0], v1[1], v1[6], v1[7],
				v2[0], v2[1], v2[6], v2[7]);
		if (pt) {
			addLocation(locations, param, v1, c1, null, pt, v2, c2, null, pt);
		}
	}

	return { statics: /** @lends Curve */{
		_getIntersections: function(v1, v2, c1, c2, locations, param) {
			if (!v2) {
				// If v2 is not provided, search for a self-intersection on v1.
				return Curve._getSelfIntersection(v1, c1, locations, param);
			}
			// Avoid checking curves if completely out of control bounds. As
			// a little optimization, we can scale the handles with 0.75
			// before calculating the control bounds and still be sure that
			// the curve is fully contained.
			var c1p1x = v1[0], c1p1y = v1[1],
				c1p2x = v1[6], c1p2y = v1[7],
				c2p1x = v2[0], c2p1y = v2[1],
				c2p2x = v2[6], c2p2y = v2[7],
				// 's' stands for scaled handles...
				c1s1x = (3 * v1[2] + c1p1x) / 4,
				c1s1y = (3 * v1[3] + c1p1y) / 4,
				c1s2x = (3 * v1[4] + c1p2x) / 4,
				c1s2y = (3 * v1[5] + c1p2y) / 4,
				c2s1x = (3 * v2[2] + c2p1x) / 4,
				c2s1y = (3 * v2[3] + c2p1y) / 4,
				c2s2x = (3 * v2[4] + c2p2x) / 4,
				c2s2y = (3 * v2[5] + c2p2y) / 4,
				min = Math.min,
				max = Math.max;
			if (!(	max(c1p1x, c1s1x, c1s2x, c1p2x) >=
					min(c2p1x, c2s1x, c2s2x, c2p2x) &&
					min(c1p1x, c1s1x, c1s2x, c1p2x) <=
					max(c2p1x, c2s1x, c2s2x, c2p2x) &&
					max(c1p1y, c1s1y, c1s2y, c1p2y) >=
					min(c2p1y, c2s1y, c2s2y, c2p2y) &&
					min(c1p1y, c1s1y, c1s2y, c1p2y) <=
					max(c2p1y, c2s1y, c2s2y, c2p2y)))
				return locations;
			// Now detect and handle overlaps:
			if (!param.startConnected && !param.endConnected) {
				var overlaps = Curve.getOverlaps(v1, v2);
				if (overlaps) {
					for (var i = 0; i < 2; i++) {
						var overlap = overlaps[i];
						addLocation(locations, param,
							v1, c1, overlap[0], null,
							v2, c2, overlap[1], null, true);
					}
					return locations;
				}
			}

			var straight1 = Curve.isStraight(v1),
				straight2 = Curve.isStraight(v2),
				straight = straight1 && straight2,
				// NOTE: Use smaller Numerical.EPSILON to compare beginnings and
				// end points to avoid matching them on almost collinear lines,
				// see: https://github.com/paperjs/paper.js/issues/777
				epsilon = 1e-12,
				before = locations.length;
			// Determine the correct intersection method based on whether one or
			// curves are straight lines:
			(straight
				? addLineIntersection
				: straight1 || straight2
					? addCurveLineIntersections
					: addCurveIntersections)(
						v1, v2, c1, c2, locations, param,
						// Define the defaults for these parameters of
						// addCurveIntersections():
						// tMin, tMax, uMin, uMax, oldTDiff, reverse, recursion
						0, 1, 0, 1, 0, false, 0);
			// We're done if we handle lines and found one intersection already:
			// https://github.com/paperjs/paper.js/issues/805#issuecomment-148503018
			if (straight && locations.length > before)
				return locations;
			// Handle the special case where the first curve's start- or end-
			// point overlaps with the second curve's start or end-point.
			var c1p1 = new Point(c1p1x, c1p1y),
				c1p2 = new Point(c1p2x, c1p2y),
				c2p1 = new Point(c2p1x, c2p1y),
				c2p2 = new Point(c2p2x, c2p2y);
			if (c1p1.isClose(c2p1, epsilon))
				addLocation(locations, param, v1, c1, 0, c1p1, v2, c2, 0, c2p1);
			if (!param.startConnected && c1p1.isClose(c2p2, epsilon))
				addLocation(locations, param, v1, c1, 0, c1p1, v2, c2, 1, c2p2);
			if (!param.endConnected && c1p2.isClose(c2p1, epsilon))
				addLocation(locations, param, v1, c1, 1, c1p2, v2, c2, 0, c2p1);
			if (c1p2.isClose(c2p2, epsilon))
				addLocation(locations, param, v1, c1, 1, c1p2, v2, c2, 1, c2p2);
			return locations;
		},

		_getSelfIntersection: function(v1, c1, locations, param) {
			// Read a detailed description of the approach used to handle self-
			// intersection, developed by @iconexperience here:
			// https://github.com/paperjs/paper.js/issues/773#issuecomment-144018379
			var p1x = v1[0], p1y = v1[1],
				h1x = v1[2], h1y = v1[3],
				h2x = v1[4], h2y = v1[5],
				p2x = v1[6], p2y = v1[7];
			// Get the side of both control handles
			var line = new Line(p1x, p1y, p2x, p2y, false),
				side1 = line.getSide(new Point(h1x, h1y), true),
				side2 = line.getSide(new Point(h2x, h2y), true);
			if (side1 === side2) {
				var edgeSum = (p1x - h2x) * (h1y - p2y)
							+ (h1x - p2x) * (h2y - p1y);
				// If both handles are on the same side, the curve can only have
				// a self intersection if the edge sum and the handles' sides
				// have different signs. If the handles are on the left side,
				// the edge sum must be negative for a self intersection (and
				// vice-versa).
				if (edgeSum * side1 > 0)
					return locations;
			}
			// As a second condition we check if the curve has an inflection
			// point. If an inflection point exists, the curve cannot have a
			// self intersection.
			var ax = p2x - 3 * h2x + 3 * h1x - p1x,
				bx = h2x - 2 * h1x + p1x,
				cx = h1x - p1x,
				ay = p2y - 3 * h2y + 3 * h1y - p1y,
				by = h2y - 2 * h1y + p1y,
				cy = h1y - p1y,
				// Condition for 1 or 2 inflection points:
				// (ay*cx-ax*cy)^2 - 4*(ay*bx-ax*by)*(by*cx-bx*cy) >= 0
				ac = ay * cx - ax * cy,
				ab = ay * bx - ax * by,
				bc = by * cx - bx * cy;
			if (ac * ac - 4 * ab * bc < 0) {
				// The curve has no inflection points, so it may have a self
				// intersection. Find the right parameter at which to split the
				// curve. We search for the parameter where the velocity has an
				// extremum by finding the roots of the cross product between
				// the bezier curve's first and second derivative.
				var roots = [],
					tSplit,
					count = Numerical.solveCubic(
							ax * ax	 + ay * ay,
							3 * (ax * bx + ay * by),
							2 * (bx * bx + by * by) + ax * cx + ay * cy,
							bx * cx + by * cy,
							roots, 0, 1);
				if (count > 0) {
					// Select extremum with highest curvature. This is always on
					// the loop in case of a self intersection.
					for (var i = 0, maxCurvature = 0; i < count; i++) {
						var curvature = Math.abs(
								c1.getCurvatureAt(roots[i], true));
						if (curvature > maxCurvature) {
							maxCurvature = curvature;
							tSplit = roots[i];
						}
					}
					// Divide the curve in two and then apply the normal curve
					// intersection code.
					var parts = Curve.subdivide(v1, tSplit);
					// After splitting, the end is always connected:
					param.endConnected = true;
					// Since the curve was split above, we need to adjust the
					// parameters for both locations.
					param.renormalize = function(t1, t2) {
						return [t1 * tSplit, t2 * (1 - tSplit) + tSplit];
					};
					Curve._getIntersections(parts[0], parts[1], c1, c1,
							locations, param);
				}
			}
			return locations;
		},

		/**
		 * Code to detect overlaps of intersecting based on work by
		 * @iconexperience: https://github.com/paperjs/paper.js/issues/648
		 */
		getOverlaps: function(v1, v2) {
			var abs = Math.abs,
				timeEpsilon = 4e-7,
				geomEpsilon = 2e-7,
				straight1 = Curve.isStraight(v1),
				straight2 = Curve.isStraight(v2),
				straight =	straight1 && straight2;

			function getLineLengthSquared(v) {
				var x = v[6] - v[0],
					y = v[7] - v[1];
				return x * x + y * y;
			}

			if (straight) {
				// Linear curves can only overlap if they are collinear. Instead
				// of using the #isCollinear() check, we pick the longer of the
				// two lines and see how far the starting and end points of the
				// other line are from this line (assumed as an infinite line).
				var flip = getLineLengthSquared(v1) < getLineLengthSquared(v2),
					l1 = flip ? v2 : v1,
					l2 = flip ? v1 : v2,
					line = new Line(l1[0], l1[1], l1[6], l1[7]);
				if (line.getDistance(new Point(l2[0], l2[1])) > geomEpsilon ||
					line.getDistance(new Point(l2[6], l2[7])) > geomEpsilon)
					return null;
			} else if (straight1 ^ straight2) {
				// If one curve is straight, the other curve must be straight,
				// too, otherwise they cannot overlap.
				return null;
			}

			var v = [v1, v2],
				pairs = [];
			// Iterate through all end points: First p1 and p2 of curve 1,
			// then p1 and p2 of curve 2.
			for (var i = 0, t1 = 0;
					i < 2 && pairs.length < 2;
					i += t1 === 0 ? 0 : 1, t1 = t1 ^ 1) {
				var t2 = Curve.getParameterOf(v[i ^ 1], new Point(
						v[i][t1 === 0 ? 0 : 6],
						v[i][t1 === 0 ? 1 : 7]));
				if (t2 != null) {  // If point is on curve
					var pair = i === 0 ? [t1, t2] : [t2, t1];
					// Filter out tiny overlaps
					// TODO: Compare distance of points instead of curve time?
					if (pairs.length === 0 ||
						abs(pair[0] - pairs[0][0]) > timeEpsilon &&
						abs(pair[1] - pairs[0][1]) > timeEpsilon)
						pairs.push(pair);
				}
				// If we checked 3 points but found no match,
				// curves cannot overlap.
				if (i === 1 && pairs.length === 0)
					break;
			}
			if (pairs.length !== 2) {
				pairs = null;
			} else if (!straight) {
				// Straight pairs don't need further checks. If we found
				// 2 pairs, the end points on v1 & v2 should be the same.
				var o1 = Curve.getPart(v1, pairs[0][0], pairs[1][0]),
					o2 = Curve.getPart(v2, pairs[0][1], pairs[1][1]);
				// Check if handles of the overlapping curves are the same too.
				if (abs(o2[2] - o1[2]) > geomEpsilon ||
					abs(o2[3] - o1[3]) > geomEpsilon ||
					abs(o2[4] - o1[4]) > geomEpsilon ||
					abs(o2[5] - o1[5]) > geomEpsilon)
					pairs = null;
			}
			return pairs;
		}
	}};
});

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
 * @class CurveLocation objects describe a location on {@link Curve} objects,
 * as defined by the curve-time {@link #parameter}, a value between {@code 0}
 * (beginning of the curve) and {@code 1} (end of the curve). If the curve is
 * part of a {@link Path} item, its {@link #index} inside the
 * {@link Path#curves} array is also provided.
 *
 * The class is in use in many places, such as
 * {@link Path#getLocationAt(offset)},
 * {@link Path#getLocationOf(point)},
 * {@link Path#getNearestLocation(point)},
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
			_overlap, _distance) {
		// Merge intersections very close to the end of a curve with the
		// beginning of the next curve.
		if (parameter > 0.9999996) {
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
		this._overlap = _overlap;
		this._distance = _distance;
		this._intersection = this._next = this._prev = null;
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

	_setSegment: function(segment) {
		this._setCurve(segment.getCurve());
		this._segment = segment;
		this._parameter = segment === this._segment1 ? 0 : 1;
		// To avoid issues with imprecision in getCurve() / trySegment()
		this._point = segment._point.clone();
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
			curve = this._parameter = this._curve = this._offset = null;
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
	 * The index of the {@link #curve} within the {@link Path#curves} list, if
	 * it is part of a {@link Path} item.
	 *
	 * @type Index
	 * @bean
	 */
	getIndex: function() {
		var curve = this.getCurve();
		return curve && curve.getIndex();
	},

	/**
	 * The curve-time parameter, as used by various bezier curve calculations.
	 * It is value between {@code 0} (beginning of the curve) and {@code 1}
	 * (end of the curve).
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
		var offset = this._offset;
		if (offset == null) {
			offset = 0;
			var path = this.getPath(),
				index = this.getIndex();
			if (path && index != null) {
				var curves = path.getCurves();
				for (var i = 0; i < index; i++)
					offset += curves[i].getLength();
			}
			this._offset = offset += this.getCurveOffset();
		}
		return offset;
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
	 * @name CurveLocation#getTangent
	 * @type Point
	 * @bean
	 */

	/**
	 * The normal vector to the {@link #curve} at the given location.
	 *
	 * @name CurveLocation#getNormal
	 * @type Point
	 * @bean
	 */

	/**
	 * The curvature of the {@link #curve} at the given location.
	 *
	 * @name CurveLocation#getCurvature
	 * @type Number
	 * @bean
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
		var curve = this.getCurve(),
			res = null;
		if (curve) {
			res = curve.divide(this.getParameter(), true);
			// Change to the newly inserted segment, also adjusting _parameter.
			if (res)
				this._setSegment(res._segment1);
		}
		return res;
	},

	split: function() {
		var curve = this.getCurve();
		return curve ? curve.split(this.getParameter(), true) : null;
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
		var res = this === loc,
			epsilon = 2e-7;
		// NOTE: We need to compare both by (index + parameter) and by proximity
		// of points. See:
		// https://github.com/paperjs/paper.js/issues/784#issuecomment-143161586
		if (!res && loc instanceof CurveLocation
				&& this.getPath() === loc.getPath()
				&& this.getPoint().isClose(loc.getPoint(), epsilon)) {
			// The position is the same, but it could still be in a different
			// location on the path. Perform more thorough checks now:
			var c1 = this.getCurve(),
				c2 = loc.getCurve(),
				abs = Math.abs,
				// We need to wrap diff around the path's beginning / end:
				diff = abs(
					((c1.isLast() && c2.isFirst() ? -1 : c1.getIndex())
							+ this.getParameter()) -
					((c2.isLast() && c1.isFirst() ? -1 : c2.getIndex())
							+ loc.getParameter()));
			res = (diff < 4e-7
				// If diff isn't close enough, compare the actual offsets of
				// both locations to determine if they're in the same spot,
				// taking into account the wrapping around path ends too.
				// This is necessary in order to handle very short consecutive
				// curves (length ~< 1e-7), which would lead to diff > 1.
				|| ((diff = abs(this.getOffset() - loc.getOffset())) < epsilon
					|| abs(this.getPath().getLength() - diff) < epsilon))
				&& (_ignoreOther
					|| (!this._intersection && !loc._intersection
						|| this._intersection && this._intersection.equals(
								loc._intersection, true)));
		}
		return res;
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


	/**
	 * {@grouptitle Tests}
	 * Checks if the location is an intersection with another curve and is
	 * merely touching the other curve, as opposed to crossing it.
	 *
	 * @return {Boolean} {@true if the location is an intersection that is
	 * merely touching another curve}
	 * @see #isCrossing()
	 */
	isTouching: function() {
		var inter = this._intersection;
		if (inter && this.getTangent().isCollinear(inter.getTangent())) {
			// Only consider two straight curves as touching if their lines
			// don't intersect.
			var curve1 = this.getCurve(),
				curve2 = inter.getCurve();
			return !(curve1.isStraight() && curve2.isStraight()
					&& curve1.getLine().intersect(curve2.getLine()));
		}
		return false;
	},

	/**
	 * Checks if the location is an intersection with another curve and is
	 * crossing the other curve, as opposed to just touching it.
	 *
	 * @return {Boolean} {@true if the location is an intersection that is
	 * crossing another curve}
	 * @see #isTouching()
	 */
	isCrossing: function() {
		// Implementation based on work by Andy Finnell:
		// http://losingfight.com/blog/2011/07/09/how-to-implement-boolean-operations-on-bezier-paths-part-3/
		// https://bitbucket.org/andyfinnell/vectorboolean
		var inter = this._intersection;
		if (!inter)
			return false;
		var t1 = this.getParameter(),
			t2 = inter.getParameter(),
			tMin = 4e-7,
			tMax = 1 - tMin;
		// If the intersection is in the middle of the path, it is either a
		// tangent or a crossing, no need for the detailed corner check below.
		// But we do need a check for the edge case of tangents?
		if (t1 >= tMin && t1 <= tMax || t2 >= tMin && t2 <= tMax)
			return !this.isTouching();
		// Values for getTangentAt() that are almost 0 and 1.
		// NOTE: Even though getTangentAt() has code to support 0 and 1 instead
		// of tMin and tMax, we still need to use this instead, as other issues
		// emerge from switching to 0 and 1 in edge cases.
		// NOTE: VectorBoolean has code that slowly shifts these points inwards
		// until the resulting tangents are not ambiguous. Do we need this too?
		var c2 = this.getCurve(),
			c1 = c2.getPrevious(),
			c4 = inter.getCurve(),
			c3 = c4.getPrevious(),
			PI = Math.PI;
		if (!c1 || !c3)
			return false;

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
	 * Checks if the location is an intersection with another curve and is
	 * part of an overlap between the two involved paths.
	 *
	 * @return {Boolean} {@true if the location is an intersection that is
	 * part of an overlap between the two involved paths}
	 * @see #isCrossing()
	 * @see #isTouching()
	 */
	isOverlap: function() {
		return !!this._overlap;
	}
}, Base.each(Curve.evaluateMethods, function(name) {
	// Produce getters for #getTangent() / #getNormal() / #getCurvature()
	var get = name + 'At';
	this[name] = function() {
		var parameter = this.getParameter(),
			curve = this.getCurve();
		return parameter != null && curve && curve[get](parameter, true);
	};
}, {
	// Do not override the existing #getPoint():
	preserve: true
}),
new function() { // Scope for statics

	function insert(locations, loc, merge) {
		// Insert-sort by path-id, curve, parameter so we can easily merge
		// duplicates with calls to equals() after.
		var length = locations.length,
			l = 0,
			r = length - 1;

		function search(index, dir) {
			// If we reach the beginning/end of the list, also compare with the
			// location at the other end, as paths are circular lists.
			// NOTE: When merging, the locations array will only contain
			// locations on the same path, so it is fine that check for the end
			// to address circularity. See PathItem#getIntersections()
			for (var i = index + dir; i >= -1 && i <= length; i += dir) {
				// Wrap the index around, to match the other ends:
				var loc2 = locations[((i % length) + length) % length];
				// Once we're outside the spot, we can stop searching.
				if (!loc.getPoint().isClose(loc2.getPoint(),
						2e-7))
					break;
				if (loc.equals(loc2))
					return loc2;
			}
			return null;
		}

		while (l <= r) {
			var m = (l + r) >>> 1,
				loc2 = locations[m],
				found;
			// See if the two locations are actually the same, and merge if
			// they are. If they aren't check the other neighbors with search()
			if (merge && (found = loc.equals(loc2) ? loc2
					: (search(m, -1) || search(m, 1)))) {
				// We're done, don't insert, merge with the found location
				// instead, and carry over overlap:
				if (loc._overlap) {
					found._overlap = found._intersection._overlap = true;
				}
				return found;
			}
		var path1 = loc.getPath(),
			path2 = loc2.getPath(),
			// NOTE: equals() takes the intersection location into account,
			// while this calculation of diff doesn't!
			diff = path1 === path2
				//Sort by both index and parameter. The two values added
				// together provides a convenient sorting index.
				? (loc.getIndex() + loc.getParameter())
				- (loc2.getIndex() + loc2.getParameter())
				// Sort by path id to group all locs on same path.
				: path1._id - path2._id;
			if (diff < 0) {
				r = m - 1;
			} else {
				l = m + 1;
			}
		}
		// We didn't merge with a preexisting location, insert it now.
		locations.splice(l, 0, loc);
		return loc;
	}

	return { statics: {
		insert: insert,

		expand: function(locations) {
			// Create a copy since insert() keeps modifying the array and
			// inserting at sorted indices.
			var expanded = locations.slice();
			for (var i = 0, l = locations.length; i < l; i++) {
				insert(expanded, locations[i]._intersection, false);
			}
			return expanded;
		}
	}};
});

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
 * @name PathItem
 *
 * @class The PathItem class is the base for any items that describe paths
 * and offer standardised methods for drawing and path manipulation, such as
 * {@link Path} and {@link CompoundPath}.
 *
 * @extends Item
 */
var PathItem = Item.extend(/** @lends PathItem# */{
	_class: 'PathItem',

	initialize: function PathItem() {
		// Do nothing.
	},

	/**
	 * Returns all intersections between two {@link PathItem} items as an array
	 * of {@link CurveLocation} objects. {@link CompoundPath} items are also
	 * supported.
	 *
	 * @param {PathItem} path the other item to find the intersections with
	 * @param {Function} [include] a callback function that can be used to
	 * filter out undesired locations right while they are collected.
	 * When defined, it shall return {@true to include a location}.
	 * @return {CurveLocation[]} the locations of all intersection between the
	 * paths
	 * @see #getCrossings(path)
	 * @example {@paperscript} // Finding the intersections between two paths
	 * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
	 * path.strokeColor = 'black';
	 *
	 * var secondPath = path.clone();
	 * var intersectionGroup = new Group();
	 *
	 * function onFrame(event) {
	 *	   secondPath.rotate(1);
	 *
	 *	   var intersections = path.getIntersections(secondPath);
	 *	   intersectionGroup.removeChildren();
	 *
	 *	   for (var i = 0; i < intersections.length; i++) {
	 *		   var intersectionPath = new Path.Circle({
	 *			   center: intersections[i].point,
	 *			   radius: 4,
	 *			   fillColor: 'red',
	 *			   parent: intersectionGroup
	 *		   });
	 *	   }
	 * }
	 */
	getIntersections: function(path, include, _matrix, _returnFirst) {
		// NOTE: For self-intersection, path is null. This means you can also
		// just call path.getIntersections() without an argument to get self
		// intersections.
		// NOTE: The hidden argument _matrix is used internally to override the
		// passed path's transformation matrix.
		var self = this === path || !path, // self-intersections?
			matrix1 = this._matrix.orNullIfIdentity(),
			matrix2 = self ? matrix1
				: (_matrix || path._matrix).orNullIfIdentity();
		// First check the bounds of the two paths. If they don't intersect,
		// we don't need to iterate through their curves.
		if (!self && !this.getBounds(matrix1).touches(path.getBounds(matrix2)))
			return [];
		var curves1 = this.getCurves(),
			curves2 = self ? curves1 : path.getCurves(),
			length1 = curves1.length,
			length2 = self ? length1 : curves2.length,
			values2 = [],
			arrays = [],
			locations,
			path;
		// Cache values for curves2 as we re-iterate them for each in curves1.
		for (var i = 0; i < length2; i++)
			values2[i] = curves2[i].getValues(matrix2);
		for (var i = 0; i < length1; i++) {
			var curve1 = curves1[i],
				values1 = self ? values2[i] : curve1.getValues(matrix1),
				path1 = curve1.getPath();
			// NOTE: Due to the nature of Curve._getIntersections(), we need to
			// use separate location arrays per path1, to make sure the
			// circularity checks are not getting confused by locations on
			// separate paths. We are flattening the separate arrays at the end.
			if (path1 !== path) {
				path = path1;
				locations = [];
				arrays.push(locations);
			}
			if (self) {
				// First check for self-intersections within the same curve.
				Curve._getSelfIntersection(values1, curve1, locations, {
					include: include,
					// Only possible if there is only one closed curve:
					startConnected: length1 === 1 &&
							curve1.getPoint1().equals(curve1.getPoint2())
				});
			}
			// Check for intersections with other curves. For self intersection,
			// we can start at i + 1 instead of 0
			for (var j = self ? i + 1 : 0; j < length2; j++) {
				// There might be already one location from the above
				// self-intersection check:
				if (_returnFirst && locations.length)
					return locations;
				var curve2 = curves2[j];
				// Avoid end point intersections on consecutive curves when
				// self intersecting.
				Curve._getIntersections(
					values1, values2[j], curve1, curve2, locations,
					{
						include: include,
						// Do not compare indices here to determine connection,
						// since one array of curves can contain curves from
						// separate sup-paths of a compound path.
						startConnected: self && curve1.getPrevious() === curve2,
						endConnected: self && curve1.getNext() === curve2
					}
				);
			}
		}
		// Now flatten the list of location arrays to one array and return it.
		locations = [];
		for (var i = 0, l = arrays.length; i < l; i++) {
			locations.push.apply(locations, arrays[i]);
		}
		return locations;
	},

	/**
	 * Returns all crossings between two {@link PathItem} items as an array
	 * of {@link CurveLocation} objects. {@link CompoundPath} items are also
	 * supported.
	 * Crossings are intersections where the paths actually are crossing each
	 * other, as opposed to simply touching.
	 *
	 * @param {PathItem} path the other item to find the crossings with
	 * @see #getIntersections(path)
	 */
	getCrossings: function(path) {
		return this.getIntersections(path, function(inter) {
			return inter.isCrossing();
		});
	},

	_asPathItem: function() {
		// See Item#_asPathItem()
		return this;
	},

	/**
	 * The path's geometry, formatted as SVG style path data.
	 *
	 * @name PathItem#getPathData
	 * @type String
	 * @bean
	 */

	setPathData: function(data) {
		// NOTE: #getPathData() is defined in CompoundPath / Path
		// This is a very compact SVG Path Data parser that works both for Path
		// and CompoundPath.

		// First split the path data into parts of command-coordinates pairs
		// Commands are any of these characters: mzlhvcsqta
		var parts = data.match(/[mlhvcsqtaz][^mlhvcsqtaz]*/ig),
			coords,
			relative = false,
			previous,
			control,
			current = new Point(),
			start = new Point();

		function getCoord(index, coord) {
			var val = +coords[index];
			if (relative)
				val += current[coord];
			return val;
		}

		function getPoint(index) {
			return new Point(
				getCoord(index, 'x'),
				getCoord(index + 1, 'y')
			);
		}

		// First clear the previous content
		this.clear();

		for (var i = 0, l = parts && parts.length; i < l; i++) {
			var part = parts[i],
				command = part[0],
				lower = command.toLowerCase();
			// Match all coordinate values
			coords = part.match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g);
			var length = coords && coords.length;
			relative = command === lower;
			if (previous === 'z' && !/[mz]/.test(lower))
				this.moveTo(current = start);
			switch (lower) {
			case 'm':
			case 'l':
				var move = lower === 'm';
				for (var j = 0; j < length; j += 2)
					this[j === 0 && move ? 'moveTo' : 'lineTo'](
							current = getPoint(j));
				control = current;
				if (move)
					start = current;
				break;
			case 'h':
			case 'v':
				var coord = lower === 'h' ? 'x' : 'y';
				for (var j = 0; j < length; j++) {
					current[coord] = getCoord(j, coord);
					this.lineTo(current);
				}
				control = current;
				break;
			case 'c':
				for (var j = 0; j < length; j += 6) {
					this.cubicCurveTo(
							getPoint(j),
							control = getPoint(j + 2),
							current = getPoint(j + 4));
				}
				break;
			case 's':
				// Smooth cubicCurveTo
				for (var j = 0; j < length; j += 4) {
					this.cubicCurveTo(
							/[cs]/.test(previous)
									? current.multiply(2).subtract(control)
									: current,
							control = getPoint(j),
							current = getPoint(j + 2));
					previous = lower;
				}
				break;
			case 'q':
				for (var j = 0; j < length; j += 4) {
					this.quadraticCurveTo(
							control = getPoint(j),
							current = getPoint(j + 2));
				}
				break;
			case 't':
				// Smooth quadraticCurveTo
				for (var j = 0; j < length; j += 2) {
					this.quadraticCurveTo(
							control = (/[qt]/.test(previous)
									? current.multiply(2).subtract(control)
									: current),
							current = getPoint(j));
					previous = lower;
				}
				break;
			case 'a':
				for (var j = 0; j < length; j += 7) {
					this.arcTo(current = getPoint(j + 5),
							new Size(+coords[j], +coords[j + 1]),
							+coords[j + 2], +coords[j + 4], +coords[j + 3]);
				}
				break;
			case 'z':
				this.closePath(true);
				break;
			}
			previous = lower;
		}
	},

	_canComposite: function() {
		// A path with only a fill	or a stroke can be directly blended, but if
		// it has both, it needs to be drawn into a separate canvas first.
		return !(this.hasFill() && this.hasStroke());
	},

	_contains: function(point) {
		// NOTE: point is reverse transformed by _matrix, so we don't need to
		// apply here.
		var winding = this._getWinding(point, false, true);
		return !!(this.getWindingRule() === 'evenodd' ? winding & 1 : winding);
	}

	/**
	 * Smooth bezier curves without changing the amount of segments or their
	 * points, by only smoothing and adjusting their handle points, for both
	 * open ended and closed paths.
	 *
	 * @name PathItem#smooth
	 * @function
	 *
	 * @example {@paperscript}
	 * // Smoothing a closed shape:
	 *
	 * // Create a rectangular path with its top-left point at
	 * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
	 * path.strokeColor = 'black';
	 *
	 * // Select the path, so we can see its handles:
	 * path.fullySelected = true;
	 *
	 * // Create a copy of the path and move it 100pt to the right:
	 * var copy = path.clone();
	 * copy.position.x += 100;
	 *
	 * // Smooth the segments of the copy:
	 * copy.smooth();
	 *
	 * @example {@paperscript height=220}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * path.add(new Point(30, 50));
	 *
	 * var y = 5;
	 * var x = 3;
	 *
	 * for (var i = 0; i < 28; i++) {
	 *	   y *= -1.1;
	 *	   x *= 1.1;
	 *	   path.lineBy(x, y);
	 * }
	 *
	 * // Create a copy of the path and move it 100pt down:
	 * var copy = path.clone();
	 * copy.position.y += 120;
	 *
	 * // Set its stroke color to red:
	 * copy.strokeColor = 'red';
	 *
	 * // Smooth the segments of the copy:
	 * copy.smooth();
	 */

	/**
	 * {@grouptitle Postscript Style Drawing Commands}
	 *
	 * On a normal empty {@link Path}, the point is simply added as the path's
	 * first segment. If called on a {@link CompoundPath}, a new {@link Path} is
	 * created as a child and the point is added as its first segment.
	 *
	 * @name PathItem#moveTo
	 * @function
	 * @param {Point} point
	 */

	// DOCS: Document #lineTo()
	/**
	 * @name PathItem#lineTo
	 * @function
	 * @param {Point} point
	 */

	/**
	 * Adds a cubic bezier curve to the path, defined by two handles and a to
	 * point.
	 *
	 * @name PathItem#cubicCurveTo
	 * @function
	 * @param {Point} handle1
	 * @param {Point} handle2
	 * @param {Point} to
	 */

	/**
	 * Adds a quadratic bezier curve to the path, defined by a handle and a to
	 * point.
	 *
	 * @name PathItem#quadraticCurveTo
	 * @function
	 * @param {Point} handle
	 * @param {Point} to
	 */

	// DOCS: Document PathItem#curveTo() 'paramater' param.
	/**
	 * Draws a curve from the position of the last segment point in the path
	 * that goes through the specified {@code through} point, to the specified
	 * {@code to} point by adding one segment to the path.
	 *
	 * @name PathItem#curveTo
	 * @function
	 * @param {Point} through the point through which the curve should go
	 * @param {Point} to the point where the curve should end
	 * @param {Number} [parameter=0.5]
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Move your mouse around the view below:
	 *
	 * var myPath;
	 * function onMouseMove(event) {
	 *	   // If we created a path before, remove it:
	 *	   if (myPath) {
	 *		   myPath.remove();
	 *	   }
	 *
	 *	   // Create a new path and add a segment point to it
	 *	   // at {x: 150, y: 150):
	 *	   myPath = new Path();
	 *	   myPath.add(150, 150);
	 *
	 *	   // Draw a curve through the position of the mouse to 'toPoint'
	 *	   var toPoint = new Point(350, 150);
	 *	   myPath.curveTo(event.point, toPoint);
	 *
	 *	   // Select the path, so we can see its segments:
	 *	   myPath.selected = true;
	 * }
	 */

	/**
	 * Draws an arc from the position of the last segment point in the path that
	 * goes through the specified {@code through} point, to the specified
	 * {@code to} point by adding one or more segments to the path.
	 *
	 * @name PathItem#arcTo
	 * @function
	 * @param {Point} through the point where the arc should pass through
	 * @param {Point} to the point where the arc should end
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * var firstPoint = new Point(30, 75);
	 * path.add(firstPoint);
	 *
	 * // The point through which we will create the arc:
	 * var throughPoint = new Point(40, 40);
	 *
	 * // The point at which the arc will end:
	 * var toPoint = new Point(130, 75);
	 *
	 * // Draw an arc through 'throughPoint' to 'toPoint'
	 * path.arcTo(throughPoint, toPoint);
	 *
	 * // Add a red circle shaped path at the position of 'throughPoint':
	 * var circle = new Path.Circle(throughPoint, 3);
	 * circle.fillColor = 'red';
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Click and drag in the view below:
	 *
	 * var myPath;
	 * function onMouseDrag(event) {
	 *	   // If we created a path before, remove it:
	 *	   if (myPath) {
	 *		   myPath.remove();
	 *	   }
	 *
	 *	   // Create a new path and add a segment point to it
	 *	   // at {x: 150, y: 150):
	 *	   myPath = new Path();
	 *	   myPath.add(150, 150);
	 *
	 *	   // Draw an arc through the position of the mouse to 'toPoint'
	 *	   var toPoint = new Point(350, 150);
	 *	   myPath.arcTo(event.point, toPoint);
	 *
	 *	   // Select the path, so we can see its segments:
	 *	   myPath.selected = true;
	 * }
	 *
	 * // When the mouse is released, deselect the path
	 * // and fill it with black.
	 * function onMouseUp(event) {
	 *	   myPath.selected = false;
	 *	   myPath.fillColor = 'black';
	 * }
	 */
	/**
	 * Draws an arc from the position of the last segment point in the path to
	 * the specified point by adding one or more segments to the path.
	 *
	 * @name PathItem#arcTo
	 * @function
	 * @param {Point} to the point where the arc should end
	 * @param {Boolean} [clockwise=true] specifies whether the arc should be
	 *		  drawn in clockwise direction
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * path.add(new Point(30, 75));
	 * path.arcTo(new Point(130, 75));
	 *
	 * var path2 = new Path();
	 * path2.strokeColor = 'red';
	 * path2.add(new Point(180, 25));
	 *
	 * // To draw an arc in anticlockwise direction,
	 * // we pass `false` as the second argument to arcTo:
	 * path2.arcTo(new Point(280, 25), false);
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Click and drag in the view below:
	 * var myPath;
	 *
	 * // The mouse has to move at least 20 points before
	 * // the next mouse drag event is fired:
	 * tool.minDistance = 20;
	 *
	 * // When the user clicks, create a new path and add
	 * // the current mouse position to it as its first segment:
	 * function onMouseDown(event) {
	 *	   myPath = new Path();
	 *	   myPath.strokeColor = 'black';
	 *	   myPath.add(event.point);
	 * }
	 *
	 * // On each mouse drag event, draw an arc to the current
	 * // position of the mouse:
	 * function onMouseDrag(event) {
	 *	   myPath.arcTo(event.point);
	 * }
	 */
	// DOCS: PathItem#arcTo(to, radius, rotation, clockwise, large)

	/**
	 * Closes the path. When closed, Paper.js connects the first and
	 * last segment of the path with an additional curve.
	 *
	 * @name PathItem#closePath
	 * @function
	 * @param {Boolean} join controls whether the method should attempt to merge
	 * the first segment with the last if they lie in the same location
	 * @see Path#closed
	 */

	/**
	 * {@grouptitle Relative Drawing Commands}
	 *
	 * If called on a {@link CompoundPath}, a new {@link Path} is created as a
	 * child and a point is added as its first segment relative to the
	 * position of the last segment of the current path.
	 *
	 * @name PathItem#moveBy
	 * @function
	 * @param {Point} to
	 */

	/**
	 * Adds a segment relative to the last segment point of the path.
	 *
	 * @name PathItem#lineBy
	 * @function
	 * @param {Point} to the vector which is added to the position of the last
	 * segment of the path, to get to the position of the new segment
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add a segment at {x: 50, y: 50}
	 * path.add(25, 25);
	 *
	 * // Add a segment relative to the last segment of the path.
	 * // 50 in x direction and 0 in y direction, becomes {x: 75, y: 25}
	 * path.lineBy(50, 0);
	 *
	 * // 0 in x direction and 50 in y direction, becomes {x: 75, y: 75}
	 * path.lineBy(0, 50);
	 *
	 * @example {@paperscript height=300}
	 * // Drawing a spiral using lineBy:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add the first segment at {x: 50, y: 50}
	 * path.add(view.center);
	 *
	 * // Loop 500 times:
	 * for (var i = 0; i < 500; i++) {
	 *	   // Create a vector with an ever increasing length
	 *	   // and an angle in increments of 45 degrees
	 *	   var vector = new Point({
	 *		   angle: i * 45,
	 *		   length: i / 2
	 *	   });
	 *	   // Add the vector relatively to the last segment point:
	 *	   path.lineBy(vector);
	 * }
	 *
	 * // Smooth the handles of the path:
	 * path.smooth();
	 *
	 * // Uncomment the following line and click on 'run' to see
	 * // the construction of the path:
	 * // path.selected = true;
	 */

	// DOCS: Document Path#curveBy()
	/**
	 * @name PathItem#curveBy
	 * @function
	 * @param {Point} through
	 * @param {Point} to
	 * @param {Number} [parameter=0.5]
	 */

	// DOCS: Document Path#cubicCurveBy()
	/**
	 * @name PathItem#cubicCurveBy
	 * @function
	 * @param {Point} handle1
	 * @param {Point} handle2
	 * @param {Point} to
	 */

	// DOCS: Document Path#quadraticCurveBy()
	/**
	 * @name PathItem#quadraticCurveBy
	 * @function
	 * @param {Point} handle
	 * @param {Point} to
	 */

	// DOCS: Document Path#arcBy(through, to)
	/**
	 * @name PathItem#arcBy
	 * @function
	 * @param {Point} through
	 * @param {Point} to
	 */

	// DOCS: Document Path#arcBy(to, clockwise)
	/**
	 * @name PathItem#arcBy
	 * @function
	 * @param {Point} to
	 * @param {Boolean} [clockwise=true]
	 */
});

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
 * @name Path
 *
 * @class The path item represents a path in a Paper.js project.
 *
 * @extends PathItem
 */
// DOCS: Explain that path matrix is always applied with each transformation.
var Path = PathItem.extend(/** @lends Path# */{
	_class: 'Path',
	_serializeFields: {
		segments: [],
		closed: false
	},

	/**
	 * Creates a new path item and places it at the top of the active layer.
	 *
	 * @name Path#initialize
	 * @param {Segment[]} [segments] An array of segments (or points to be
	 * converted to segments) that will be added to the path
	 * @return {Path} the newly created path
	 *
	 * @example
	 * // Create an empty path and add segments to it:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(new Point(30, 30));
	 * path.add(new Point(100, 100));
	 *
	 * @example
	 * // Create a path with two segments:
	 * var segments = [new Point(30, 30), new Point(100, 100)];
	 * var path = new Path(segments);
	 * path.strokeColor = 'black';
	 */
	/**
	 * Creates a new path item from an object description and places it at the
	 * top of the active layer.
	 *
	 * @name Path#initialize
	 * @param {Object} object an object literal containing properties to
	 * be set on the path
	 * @return {Path} the newly created path
	 *
	 * @example {@paperscript}
	 * var path = new Path({
	 *	   segments: [[20, 20], [80, 80], [140, 20]],
	 *	   fillColor: 'black',
	 *	   closed: true
	 * });
	 *
	 * @example {@paperscript}
	 * var path = new Path({
	 *	   segments: [[20, 20], [80, 80], [140, 20]],
	 *	   strokeColor: 'red',
	 *	   strokeWidth: 20,
	 *	   strokeCap: 'round',
	 *	   selected: true
	 * });
	 */
	/**
	 * Creates a new path item from SVG path-data and places it at the top of
	 * the active layer.
	 *
	 * @param
	 * @name Path#initialize
	 * @param {String} pathData the SVG path-data that describes the geometry
	 * of this path
	 * @return {Path} the newly created path
	 *
	 * @example {@paperscript}
	 * var pathData = 'M100,50c0,27.614-22.386,50-50,50S0,77.614,0,50S22.386,0,50,0S100,22.386,100,50';
	 * var path = new Path(pathData);
	 * path.fillColor = 'red';
	 */
	initialize: function Path(arg) {
		this._closed = false;
		this._segments = [];
		// Increased on every change of segments, so CurveLocation knows when to
		// update its internally cached values.
		this._version = 0;
		// arg can either be an object literal containing properties to be set
		// on the path, a list of segments to be set, or the first of multiple
		// arguments describing separate segments.
		// If it is an array, it can also be a description of a point, so
		// check its first entry for object as well.
		// But first see if segments are directly passed at all. If not, try
		// _set(arg).
		var segments = Array.isArray(arg)
			? typeof arg[0] === 'object'
				? arg
				: arguments
			// See if it behaves like a segment or a point, but filter out
			// rectangles, as accepted by some Path.Constructor constructors.
			: arg && (arg.size === undefined && (arg.x !== undefined
					|| arg.point !== undefined))
				? arguments
				: null;
		// Always call setSegments() to initialize a few related variables.
		if (segments && segments.length > 0) {
			// This sets _curves and _selectedSegmentState too!
			this.setSegments(segments);
		} else {
			this._curves = undefined; // For hidden class optimization
			this._selectedSegmentState = 0;
			if (!segments && typeof arg === 'string') {
				this.setPathData(arg);
				// Erase for _initialize() call below.
				arg = null;
			}
		}
		// Only pass on arg as props if it wasn't consumed for segments already.
		this._initialize(!segments && arg);
	},

	_equals: function(item) {
		return this._closed === item._closed
				&& Base.equals(this._segments, item._segments);
	},

	clone: function(insert) {
		var copy = new Path(Item.NO_INSERT);
		copy.setSegments(this._segments);
		copy._closed = this._closed;
		if (this._clockwise !== undefined)
			copy._clockwise = this._clockwise;
		return this._clone(copy, insert);
	},

	_changed: function _changed(flags) {
		_changed.base.call(this, flags);
		if (flags & 8) {
			// The _currentPath is already cleared in Item, but clear it on the
			// parent too, for children of CompoundPaths, and Groups (ab)used as
			// clipping paths.
			var parent = this._parent;
			if (parent)
				parent._currentPath = undefined;
			// Clockwise state becomes undefined as soon as geometry changes.
			// Also clear cached mono curves used for winding calculations.
			this._length = this._area = this._clockwise = this._monoCurves =
					undefined;
			if (flags & 16) {
				this._version++; // See CurveLocation
			} else if (this._curves) {
				// Only notify all curves if we're not told that only segments
				// have changed and took already care of notifications.
			   for (var i = 0, l = this._curves.length; i < l; i++)
					this._curves[i]._changed();
			}
		} else if (flags & 32) {
			// TODO: We could preserve the purely geometric bounds that are not
			// affected by stroke: _bounds.bounds and _bounds.handleBounds
			this._bounds = undefined;
		}
	},

	getStyle: function() {
		// If this path is part of a compound-path, return the parent's style.
		var parent = this._parent;
		return (parent instanceof CompoundPath ? parent : this)._style;
	},

	/**
	 * The segments contained within the path.
	 *
	 * @type Segment[]
	 * @bean
	 */
	getSegments: function() {
		return this._segments;
	},

	setSegments: function(segments) {
		var fullySelected = this.isFullySelected();
		this._segments.length = 0;
		this._selectedSegmentState = 0;
		// Calculate new curves next time we call getCurves()
		this._curves = undefined;
		if (segments && segments.length > 0)
			this._add(Segment.readAll(segments));
		// Preserve fullySelected state.
		// TODO: Do we still need this?
		if (fullySelected)
			this.setFullySelected(true);
	},

	/**
	 * The first Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getFirstSegment: function() {
		return this._segments[0];
	},

	/**
	 * The last Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getLastSegment: function() {
		return this._segments[this._segments.length - 1];
	},

	/**
	 * The curves contained within the path.
	 *
	 * @type Curve[]
	 * @bean
	 */
	getCurves: function() {
		var curves = this._curves,
			segments = this._segments;
		if (!curves) {
			var length = this._countCurves();
			curves = this._curves = new Array(length);
			for (var i = 0; i < length; i++)
				curves[i] = new Curve(this, segments[i],
					// Use first segment for segment2 of closing curve
					segments[i + 1] || segments[0]);
		}
		return curves;
	},

	/**
	 * The first Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getFirstCurve: function() {
		return this.getCurves()[0];
	},

	/**
	 * The last Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getLastCurve: function() {
		var curves = this.getCurves();
		return curves[curves.length - 1];
	},

	/**
	 * Specifies whether the path is closed. If it is closed, Paper.js connects
	 * the first and last segments.
	 *
	 * @type Boolean
	 * @bean
	 *
	 * @example {@paperscript}
	 * var myPath = new Path();
	 * myPath.strokeColor = 'black';
	 * myPath.add(new Point(50, 75));
	 * myPath.add(new Point(100, 25));
	 * myPath.add(new Point(150, 75));
	 *
	 * // Close the path:
	 * myPath.closed = true;
	 */
	isClosed: function() {
		return this._closed;
	},

	setClosed: function(closed) {
		// On-the-fly conversion to boolean:
		if (this._closed != (closed = !!closed)) {
			this._closed = closed;
			// Update _curves length
			if (this._curves) {
				var length = this._curves.length = this._countCurves();
				// If we were closing this path, we need to add a new curve now
				if (closed)
					this._curves[length - 1] = new Curve(this,
						this._segments[length - 1], this._segments[0]);
			}
			// Use SEGMENTS notification instead of GEOMETRY since curves are
			// up-to-date and don't need notification.
			this._changed(25);
		}
	}
}, /** @lends Path# */{
	// Enforce bean creation for getPathData(), as it has hidden parameters.
	beans: true,

	getPathData: function(_matrix, _precision) {
		// NOTE: #setPathData() is defined in PathItem.
		var segments = this._segments,
			length = segments.length,
			f = new Formatter(_precision),
			coords = new Array(6),
			first = true,
			curX, curY,
			prevX, prevY,
			inX, inY,
			outX, outY,
			parts = [];

		function addSegment(segment, skipLine) {
			segment._transformCoordinates(_matrix, coords, false);
			curX = coords[0];
			curY = coords[1];
			if (first) {
				parts.push('M' + f.pair(curX, curY));
				first = false;
			} else {
				inX = coords[2];
				inY = coords[3];
				// TODO: Add support for H/V and/or relative commands, where
				// appropriate and resulting in shorter strings.
				if (inX === curX && inY === curY
						&& outX === prevX && outY === prevY) {
					// l = relative lineto:
					if (!skipLine)
						parts.push('l' + f.pair(curX - prevX, curY - prevY));
				} else {
					// c = relative curveto:
					parts.push('c' + f.pair(outX - prevX, outY - prevY)
							+ ' ' + f.pair(inX - prevX, inY - prevY)
							+ ' ' + f.pair(curX - prevX, curY - prevY));
				}
			}
			prevX = curX;
			prevY = curY;
			outX = coords[4];
			outY = coords[5];
		}

		if (length === 0)
			return '';

		for (var i = 0; i < length; i++)
			addSegment(segments[i]);
		// Close path by drawing first segment again
		if (this._closed && length > 0) {
			addSegment(segments[0], true);
			parts.push('z');
		}
		return parts.join('');
	}
}, /** @lends Path# */{

	// TODO: Consider adding getSubPath(a, b), returning a part of the current
	// path, with the added benefit that b can be < a, and closed looping is
	// taken into account.

	isEmpty: function() {
		return this._segments.length === 0;
	},

	_transformContent: function(matrix) {
		var coords = new Array(6);
		for (var i = 0, l = this._segments.length; i < l; i++)
			this._segments[i]._transformCoordinates(matrix, coords, true);
		return true;
	},

	/**
	 * Private method that adds segments to the segment list. It assumes that
	 * the passed object is an array of segments already and does not perform
	 * any checks. If a curves list was requested, it will be kept in sync with
	 * the segments list automatically.
	 */
	_add: function(segs, index) {
		// Local short-cuts:
		var segments = this._segments,
			curves = this._curves,
			amount = segs.length,
			append = index == null,
			index = append ? segments.length : index;
		// Scan through segments to add first, convert if necessary and set
		// _path and _index references on them.
		for (var i = 0; i < amount; i++) {
			var segment = segs[i];
			// If the segments belong to another path already, clone them before
			// adding:
			if (segment._path)
				segment = segs[i] = segment.clone();
			segment._path = this;
			segment._index = index + i;
			// If parts of this segment are selected, adjust the internal
			// _selectedSegmentState now
			if (segment._selectionState)
				this._updateSelection(segment, 0, segment._selectionState);
		}
		if (append) {
			// Append them all at the end by using push
			segments.push.apply(segments, segs);
		} else {
			// Insert somewhere else
			segments.splice.apply(segments, [index, 0].concat(segs));
			// Adjust the indices of the segments above.
			for (var i = index + amount, l = segments.length; i < l; i++)
				segments[i]._index = i;
		}
		// Keep the curves list in sync all the time in case it was requested
		// already.
		if (curves) {
			var total = this._countCurves(),
				// If we're adding a new segment to the end of an open path,
				// we need to step one index down to get its curve.
				from = index + amount - 1 === total ? index - 1 : index,
				start = from,
				to = Math.min(from + amount, total);
			if (segs._curves) {
				// Reuse removed curves.
				curves.splice.apply(curves, [from, 0].concat(segs._curves));
				start += segs._curves.length;
			}
			// Insert new curves, but do not initialize their segments yet,
			// since #_adjustCurves() handles all that for us.
			for (var i = start; i < to; i++)
				curves.splice(i, 0, new Curve(this, null, null));
			// Adjust segments for the curves before and after the removed ones
			this._adjustCurves(from, to);
		}
		// Use SEGMENTS notification instead of GEOMETRY since curves are kept
		// up-to-date by _adjustCurves() and don't need notification.
		this._changed(25);
		return segs;
	},

	/**
	 * Adjusts segments of curves before and after inserted / removed segments.
	 */
	_adjustCurves: function(from, to) {
		var segments = this._segments,
			curves = this._curves,
			curve;
		for (var i = from; i < to; i++) {
			curve = curves[i];
			curve._path = this;
			curve._segment1 = segments[i];
			curve._segment2 = segments[i + 1] || segments[0];
			curve._changed();
		}
		// If it's the first segment, correct the last segment of closed
		// paths too:
		if (curve = curves[this._closed && from === 0 ? segments.length - 1
				: from - 1]) {
			curve._segment2 = segments[from] || segments[0];
			curve._changed();
		}
		// Fix the segment after the modified range, if it exists
		if (curve = curves[to]) {
			curve._segment1 = segments[to];
			curve._changed();
		}
	},

	/**
	 * Returns the amount of curves this path item is supposed to have, based
	 * on its amount of #segments and #closed state.
	 */
	_countCurves: function() {
		var length = this._segments.length;
		// Reduce length by one if it's an open path:
		return !this._closed && length > 0 ? length - 1 : length;
	},

	// DOCS: find a way to document the variable segment parameters of Path#add
	/**
	 * Adds one or more segments to the end of the {@link #segments} array of
	 * this path.
	 *
	 * @param {Segment|Point} segment the segment or point to be added.
	 * @return {Segment} the added segment. This is not necessarily the same
	 * object, e.g. if the segment to be added already belongs to another path
	 *
	 * @example {@paperscript}
	 * // Adding segments to a path using point objects:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Add a segment at {x: 30, y: 75}
	 * path.add(new Point(30, 75));
	 *
	 * // Add two segments in one go at {x: 100, y: 20}
	 * // and {x: 170, y: 75}:
	 * path.add(new Point(100, 20), new Point(170, 75));
	 *
	 * @example {@paperscript}
	 * // Adding segments to a path using arrays containing number pairs:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Add a segment at {x: 30, y: 75}
	 * path.add([30, 75]);
	 *
	 * // Add two segments in one go at {x: 100, y: 20}
	 * // and {x: 170, y: 75}:
	 * path.add([100, 20], [170, 75]);
	 *
	 * @example {@paperscript}
	 * // Adding segments to a path using objects:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Add a segment at {x: 30, y: 75}
	 * path.add({x: 30, y: 75});
	 *
	 * // Add two segments in one go at {x: 100, y: 20}
	 * // and {x: 170, y: 75}:
	 * path.add({x: 100, y: 20}, {x: 170, y: 75});
	 *
	 * @example {@paperscript}
	 * // Adding a segment with handles to a path:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(30, 75));
	 *
	 * // Add a segment with handles:
	 * var point = new Point(100, 20);
	 * var handleIn = new Point(-50, 0);
	 * var handleOut = new Point(50, 0);
	 * var added = path.add(new Segment(point, handleIn, handleOut));
	 *
	 * // Select the added segment, so we can see its handles:
	 * added.selected = true;
	 *
	 * path.add(new Point(170, 75));
	 */
	add: function(segment1 /*, segment2, ... */) {
		return arguments.length > 1 && typeof segment1 !== 'number'
			// addSegments
			? this._add(Segment.readAll(arguments))
			// addSegment
			: this._add([ Segment.read(arguments) ])[0];
	},

	/**
	 * Inserts one or more segments at a given index in the list of this path's
	 * segments.
	 *
	 * @param {Number} index the index at which to insert the segment
	 * @param {Segment|Point} segment the segment or point to be inserted.
	 * @return {Segment} the added segment. This is not necessarily the same
	 * object, e.g. if the segment to be added already belongs to another path
	 *
	 * @example {@paperscript}
	 * // Inserting a segment:
	 * var myPath = new Path();
	 * myPath.strokeColor = 'black';
	 * myPath.add(new Point(50, 75));
	 * myPath.add(new Point(150, 75));
	 *
	 * // Insert a new segment into myPath at index 1:
	 * myPath.insert(1, new Point(100, 25));
	 *
	 * // Select the segment which we just inserted:
	 * myPath.segments[1].selected = true;
	 *
	 * @example {@paperscript}
	 * // Inserting multiple segments:
	 * var myPath = new Path();
	 * myPath.strokeColor = 'black';
	 * myPath.add(new Point(50, 75));
	 * myPath.add(new Point(150, 75));
	 *
	 * // Insert two segments into myPath at index 1:
	 * myPath.insert(1, [80, 25], [120, 25]);
	 *
	 * // Select the segments which we just inserted:
	 * myPath.segments[1].selected = true;
	 * myPath.segments[2].selected = true;
	 */
	insert: function(index, segment1 /*, segment2, ... */) {
		return arguments.length > 2 && typeof segment1 !== 'number'
			// insertSegments
			? this._add(Segment.readAll(arguments, 1), index)
			// insertSegment
			: this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	addSegment: function(/* segment */) {
		return this._add([ Segment.read(arguments) ])[0];
	},

	insertSegment: function(index /*, segment */) {
		return this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	/**
	 * Adds an array of segments (or types that can be converted to segments)
	 * to the end of the {@link #segments} array.
	 *
	 * @param {Segment[]} segments
	 * @return {Segment[]} an array of the added segments. These segments are
	 * not necessarily the same objects, e.g. if the segment to be added already
	 * belongs to another path
	 *
	 * @example {@paperscript}
	 * // Adding an array of Point objects:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 * var points = [new Point(30, 50), new Point(170, 50)];
	 * path.addSegments(points);
	 *
	 * @example {@paperscript}
	 * // Adding an array of [x, y] arrays:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 * var array = [[30, 75], [100, 20], [170, 75]];
	 * path.addSegments(array);
	 *
	 * @example {@paperscript}
	 * // Adding segments from one path to another:
	 *
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 * path.addSegments([[30, 75], [100, 20], [170, 75]]);
	 *
	 * var path2 = new Path();
	 * path2.strokeColor = 'red';
	 *
	 * // Add the second and third segments of path to path2:
	 * path2.add(path.segments[1], path.segments[2]);
	 *
	 * // Move path2 30pt to the right:
	 * path2.position.x += 30;
	 */
	addSegments: function(segments) {
		return this._add(Segment.readAll(segments));
	},

	/**
	 * Inserts an array of segments at a given index in the path's
	 * {@link #segments} array.
	 *
	 * @param {Number} index the index at which to insert the segments
	 * @param {Segment[]} segments the segments to be inserted
	 * @return {Segment[]} an array of the added segments. These segments are
	 * not necessarily the same objects, e.g. if the segment to be added already
	 * belongs to another path
	 */
	insertSegments: function(index, segments) {
		return this._add(Segment.readAll(segments), index);
	},

	/**
	 * Removes the segment at the specified index of the path's
	 * {@link #segments} array.
	 *
	 * @param {Number} index the index of the segment to be removed
	 * @return {Segment} the removed segment
	 *
	 * @example {@paperscript}
	 * // Removing a segment from a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle({
	 *	   center: new Point(80, 50),
	 *	   radius: 35,
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Remove its second segment:
	 * path.removeSegment(1);
	 *
	 * // Select the path, so we can see its segments:
	 * path.selected = true;
	 */
	removeSegment: function(index) {
		return this.removeSegments(index, index + 1)[0] || null;
	},

	/**
	 * Removes all segments from the path's {@link #segments} array.
	 *
	 * @name Path#removeSegments
	 * @alias Path#clear
	 * @function
	 * @return {Segment[]} an array containing the removed segments
	 */
	/**
	 * Removes the segments from the specified {@code from} index to the
	 * {@code to} index from the path's {@link #segments} array.
	 *
	 * @param {Number} from the beginning index, inclusive
	 * @param {Number} [to=segments.length] the ending index, exclusive
	 * @return {Segment[]} an array containing the removed segments
	 *
	 * @example {@paperscript}
	 * // Removing segments from a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle({
	 *	   center: new Point(80, 50),
	 *	   radius: 35,
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Remove the segments from index 1 till index 2:
	 * path.removeSegments(1, 2);
	 *
	 * // Select the path, so we can see its segments:
	 * path.selected = true;
	 */
	removeSegments: function(from, to, _includeCurves) {
		from = from || 0;
		to = Base.pick(to, this._segments.length);
		var segments = this._segments,
			curves = this._curves,
			count = segments.length, // segment count before removal
			removed = segments.splice(from, to - from),
			amount = removed.length;
		if (!amount)
			return removed;
		// Update selection state accordingly
		for (var i = 0; i < amount; i++) {
			var segment = removed[i];
			if (segment._selectionState)
				this._updateSelection(segment, segment._selectionState, 0);
			// Clear the indices and path references of the removed segments
			segment._index = segment._path = null;
		}
		// Adjust the indices of the segments above.
		for (var i = from, l = segments.length; i < l; i++)
			segments[i]._index = i;
		// Keep curves in sync
		if (curves) {
			// If we're removing the last segment, remove the last curve (the
			// one to the left of the segment, not to the right, as normally).
			// Also take into account closed paths, which have one curve more
			// than segments.
			var index = from > 0 && to === count + (this._closed ? 1 : 0)
					? from - 1
					: from,
				curves = curves.splice(index, amount);
			// Return the removed curves as well, if we're asked to include
			// them, but exclude the first curve, since that's shared with the
			// previous segment and does not connect the returned segments.
			if (_includeCurves)
				removed._curves = curves.slice(1);
			// Adjust segments for the curves before and after the removed ones
			this._adjustCurves(index, index);
		}
		// Use SEGMENTS notification instead of GEOMETRY since curves are kept
		// up-to-date by _adjustCurves() and don't need notification.
		this._changed(25);
		return removed;
	},

	// DOCS Path#clear()
	clear: '#removeSegments',

	/**
	 * Checks if any of the curves in the path have curve handles set.
	 *
	 * @return {Boolean} {@true if the path has curve handles set}
	 * @see Segment#hasHandles()
	 * @see Curve#hasHandles()
	 */
	hasHandles: function() {
		var segments = this._segments;
		for (var i = 0, l = segments.length; i < l; i++) {
			if (segments[i].hasHandles())
				return true;
		}
		return false;
	},

	/**
	 * Clears the path's handles by setting their coordinates to zero,
	 * turning the path into a polygon (or a polyline if it isn't closed).
	 */
	clearHandles: function() {
		var segments = this._segments;
		for (var i = 0, l = segments.length; i < l; i++)
			segments[i].clearHandles();
	},

	/**
	 * The approximate length of the path.
	 *
	 * @type Number
	 * @bean
	 */
	getLength: function() {
		if (this._length == null) {
			var curves = this.getCurves(),
				length = 0;
			for (var i = 0, l = curves.length; i < l; i++)
				length += curves[i].getLength();
			this._length = length;
		}
		return this._length;
	},

	/**
	 * The area that the path's geometry is covering. Self-intersecting paths
	 * can contain sub-areas that cancel each other out.
	 *
	 * @type Number
	 * @bean
	 */
	getArea: function() {
		if (this._area == null) {
			var segments = this._segments,
				count = segments.length,
				last = count - 1,
				area = 0;
			for (var i = 0, l = this._closed ? count : last; i < l; i++) {
				area += Curve.getArea(Curve.getValues(
						segments[i], segments[i < last ? i + 1 : 0]));
			}
			this._area = area;
		}
		return this._area;
	},

	/**
	 * Specifies whether the path is oriented clock-wise.
	 *
	 * @type Boolean
	 * @bean
	 */
	isClockwise: function() {
		if (this._clockwise !== undefined)
			return this._clockwise;
		return this.getArea() >= 0;
	},

	setClockwise: function(clockwise) {
		// Only revers the path if its clockwise orientation is not the same
		// as what it is now demanded to be.
		// On-the-fly conversion to boolean:
		if (this.isClockwise() != (clockwise = !!clockwise))
			this.reverse();
		// Reverse only flips _clockwise state if it was already set, so let's
		// always set this here now.
		this._clockwise = clockwise;
	},

	/**
	 * Specifies whether an path is selected and will also return {@code true}
	 * if the path is partially selected, i.e. one or more of its segments is
	 * selected.
	 *
	 * Paper.js draws the visual outlines of selected items on top of your
	 * project. This can be useful for debugging, as it allows you to see the
	 * construction of paths, position of path curves, individual segment points
	 * and bounding boxes of symbol and raster items.
	 *
	 * @type Boolean
	 * @bean
	 * @see Project#selectedItems
	 * @see Segment#selected
	 * @see Point#selected
	 *
	 * @example {@paperscript}
	 * // Selecting an item:
	 * var path = new Path.Circle({
	 *	   center: new Size(80, 50),
	 *	   radius: 35
	 * });
	 * path.selected = true; // Select the path
	 *
	 * @example {@paperscript}
	 * // A path is selected, if one or more of its segments is selected:
	 * var path = new Path.Circle({
	 *	   center: new Size(80, 50),
	 *	   radius: 35
	 * });
	 *
	 * // Select the second segment of the path:
	 * path.segments[1].selected = true;
	 *
	 * // If the path is selected (which it is), set its fill color to red:
	 * if (path.selected) {
	 *	   path.fillColor = 'red';
	 * }
	 *
	 */
	/**
	 * Specifies whether the path and all its segments are selected. Cannot be
	 * {@code true} on an empty path.
	 *
	 * @type Boolean
	 * @bean
	 *
	 * @example {@paperscript}
	 * // A path is fully selected, if all of its segments are selected:
	 * var path = new Path.Circle({
	 *	   center: new Size(80, 50),
	 *	   radius: 35
	 * });
	 * path.fullySelected = true;
	 *
	 * var path2 = new Path.Circle({
	 *	   center: new Size(180, 50),
	 *	   radius: 35
	 * });
	 *
	 * // Deselect the second segment of the second path:
	 * path2.segments[1].selected = false;
	 *
	 * // If the path is fully selected (which it is),
	 * // set its fill color to red:
	 * if (path.fullySelected) {
	 *	   path.fillColor = 'red';
	 * }
	 *
	 * // If the second path is fully selected (which it isn't, since we just
	 * // deselected its second segment),
	 * // set its fill color to red:
	 * if (path2.fullySelected) {
	 *	   path2.fillColor = 'red';
	 * }
	 */
	isFullySelected: function() {
		var length = this._segments.length;
		return this._selected && length > 0 && this._selectedSegmentState
				=== length * 7;
	},

	setFullySelected: function(selected) {
		// No need to call _selectSegments() when selected is false, since
		// #setSelected() does that for us
		if (selected)
			this._selectSegments(true);
		this.setSelected(selected);
	},

	setSelected: function setSelected(selected) {
		// Deselect all segments when path is marked as not selected
		if (!selected)
			this._selectSegments(false);
		// No need to pass true for noChildren since Path has none anyway.
		setSelected.base.call(this, selected);
	},

	_selectSegments: function(selected) {
		var length = this._segments.length;
		this._selectedSegmentState = selected
				? length * 7 : 0;
		for (var i = 0; i < length; i++)
			this._segments[i]._selectionState = selected
					? 7 : 0;
	},

	_updateSelection: function(segment, oldState, newState) {
		segment._selectionState = newState;
		var total = this._selectedSegmentState += newState - oldState;
		// Set this path as selected in case we have selected segments. Do not
		// unselect if we're down to 0, as the path itself can still remain
		// selected even when empty.
		if (total > 0)
			this.setSelected(true);
	},

	/**
	 * Converts the curves in a path to straight lines with an even distribution
	 * of points. The distance between the produced segments is as close as
	 * possible to the value specified by the {@code maxDistance} parameter.
	 *
	 * @param {Number} maxDistance the maximum distance between the points
	 *
	 * @example {@paperscript}
	 * // Flattening a circle shaped path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle({
	 *	   center: new Size(80, 50),
	 *	   radius: 35
	 * });
	 *
	 * // Select the path, so we can inspect its segments:
	 * path.selected = true;
	 *
	 * // Create a copy of the path and move it 150 points to the right:
	 * var copy = path.clone();
	 * copy.position.x += 150;
	 *
	 * // Convert its curves to points, with a max distance of 20:
	 * copy.flatten(20);
	 */
	flatten: function(maxDistance) {
		var iterator = new PathIterator(this, 64, 0.1),
			pos = 0,
			// Adapt step = maxDistance so the points distribute evenly.
			step = iterator.length / Math.ceil(iterator.length / maxDistance),
			// Add/remove half of step to end, so imprecisions are ok too.
			// For closed paths, remove it, because we don't want to add last
			// segment again
			end = iterator.length + (this._closed ? -step : step) / 2;
		// Iterate over path and evaluate and add points at given offsets
		var segments = [];
		while (pos <= end) {
			segments.push(new Segment(iterator.getPointAt(pos)));
			pos += step;
		}
		this.setSegments(segments);
	},

	/**
	 * Reduces the path by removing curves that have a length of 0,
	 * and unnecessary segments between two collinear curves.
	 */
	reduce: function() {
		var curves = this.getCurves();
		for (var i = curves.length - 1; i >= 0; i--) {
			var curve = curves[i];
			if (!curve.hasHandles() && (curve.getLength() === 0
					|| curve.isCollinear(curve.getNext())))
				curve.remove();
		}
		return this;
	},

	/**
	 * Smooths a path by simplifying it. The {@link Path#segments} array is
	 * analyzed and replaced by a more optimal set of segments, reducing memory
	 * usage and speeding up drawing.
	 *
	 * @param {Number} [tolerance=2.5]
	 *
	 * @example {@paperscript height=300}
	 * // Click and drag below to draw to draw a line, when you release the
	 * // mouse, the is made smooth using path.simplify():
	 *
	 * var path;
	 * function onMouseDown(event) {
	 *	   // If we already made a path before, deselect it:
	 *	   if (path) {
	 *		   path.selected = false;
	 *	   }
	 *
	 *	   // Create a new path and add the position of the mouse
	 *	   // as its first segment. Select it, so we can see the
	 *	   // segment points:
	 *	   path = new Path({
	 *		   segments: [event.point],
	 *		   strokeColor: 'black',
	 *		   selected: true
	 *	   });
	 * }
	 *
	 * function onMouseDrag(event) {
	 *	   // On every drag event, add a segment to the path
	 *	   // at the position of the mouse:
	 *	   path.add(event.point);
	 * }
	 *
	 * function onMouseUp(event) {
	 *	   // When the mouse is released, simplify the path:
	 *	   path.simplify();
	 *	   path.selected = true;
	 * }
	 */
	simplify: function(tolerance) {
		if (this._segments.length > 2) {
			var fitter = new PathFitter(this, tolerance || 2.5);
			this.setSegments(fitter.fit());
		}
	},

	// TODO: reduceSegments([flatness])

	/**
	 * Splits the path at the given offset. After splitting, the path will be
	 * open. If the path was open already, splitting will result in two paths.
	 *
	 * @name Path#split
	 * @function
	 * @param {Number} offset the offset at which to split the path
	 * as a number between 0 and {@link Path#length}
	 * @return {Path} the newly created path after splitting, if any
	 *
	 * @example {@paperscript} // Splitting an open path
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(20, 20);
	 *
	 * // Add an arc through {x: 90, y: 80} to {x: 160, y: 20}
	 * path.arcTo([90, 80], [160, 20]);
	 *
	 * // Split the path at 30% of its length:
	 * var path2 = path.split(path.length * 0.3);
	 * path2.strokeColor = 'red';
	 *
	 * // Move the newly created path 40px to the right:
	 * path2.position.x += 40;
	 *
	 * @example {@paperscript} // Splitting a closed path
	 * var path = new Path.Rectangle({
	 *	   from: [20, 20],
	 *	   to: [80, 80],
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Split the path at 60% of its length:
	 * path.split(path.length * 0.6);
	 *
	 * // Move the first segment, to show where the path
	 * // was split:
	 * path.firstSegment.point.x += 20;
	 *
	 * // Select the first segment:
	 * path.firstSegment.selected = true;
	 */
	/**
	 * Splits the path at the given curve location. After splitting, the path
	 * will be open. If the path was open already, splitting will result in two
	 * paths.
	 *
	 * @name Path#split
	 * @function
	 * @param {CurveLocation} location the curve location at which to split
	 * the path
	 * @return {Path} the newly created path after splitting, if any
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 40,
	 *	   strokeColor: 'black'
	 * });
	 *
	 * var pointOnCircle = view.center + {
	 *	   length: 40,
	 *	   angle: 30
	 * };
	 *
	 * var curveLocation = path.getNearestLocation(pointOnCircle);
	 *
	 * path.split(curveLocation);
	 * path.lastSegment.selected = true;
	 */
	/**
	 * Splits the path at the given curve index and parameter. After splitting,
	 * the path will be open. If the path was open already, splitting will
	 * result in two paths.
	 *
	 * @example {@paperscript} // Splitting an open path
	 * // Draw a V shaped path:
	 * var path = new Path([20, 20], [50, 80], [80, 20]);
	 * path.strokeColor = 'black';
	 *
	 * // Split the path half-way down its second curve:
	 * var path2 = path.split(1, 0.5);
	 *
	 * // Give the resulting path a red stroke-color
	 * // and move it 20px to the right:
	 * path2.strokeColor = 'red';
	 * path2.position.x += 20;
	 *
	 * @example {@paperscript} // Splitting a closed path
	 * var path = new Path.Rectangle({
	 *	   from: [20, 20],
	 *	   to: [80, 80],
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Split the path half-way down its second curve:
	 * path.split(2, 0.5);
	 *
	 * // Move the first segment, to show where the path
	 * // was split:
	 * path.firstSegment.point.x += 20;
	 *
	 * // Select the first segment:
	 * path.firstSegment.selected = true;
	 *
	 * @param {Number} index the index of the curve in the {@link Path#curves}
	 * array at which to split
	 * @param {Number} parameter the curve-time parameter at which the curve
	 * will be split
	 * @return {Path} the newly created path after splitting, if any
	 */
	split: function(index, parameter) {
		if (parameter === null)
			return null;
		if (arguments.length === 1) {
			var arg = index;
			// split(offset), convert offset to location
			if (typeof arg === 'number')
				arg = this.getLocationAt(arg);
			if (!arg)
				return null
			// split(location)
			index = arg.index;
			parameter = arg.parameter;
		}
		var tMin = 4e-7,
			tMax = 1 - tMin;
		if (parameter >= tMax) {
			// t == 1 is the same as t == 0 and index ++
			index++;
			parameter--;
		}
		var curves = this.getCurves();
		if (index >= 0 && index < curves.length) {
			// Only divide curves if we're not on an existing segment already.
			if (parameter >= tMin) {
				// Divide the curve with the index at given parameter.
				// Increase because dividing adds more segments to the path.
				curves[index++].divide(parameter, true);
			}
			// Create the new path with the segments to the right of given
			// parameter, which are removed from the current path. Pass true
			// for includeCurves, since we want to preserve and move them to
			// the new path through _add(), allowing us to have CurveLocation
			// keep the connection to the new path through moved curves.
			var segs = this.removeSegments(index, this._segments.length, true),
				path;
			if (this._closed) {
				// If the path is closed, open it and move the segments round,
				// otherwise create two paths.
				this.setClosed(false);
				// Just have path point to this. The moving around of segments
				// will happen below.
				path = this;
			} else {
				path = new Path(Item.NO_INSERT);
				// Pass true for _preserve, in case of CompoundPath, to avoid
				// reversing of path direction, which would mess with segments!
				path.insertAbove(this, true);
				// Use _clone to copy over all other attributes, including style
				this._clone(path);
			}
			path._add(segs, 0);
			// Add dividing segment again. In case of a closed path, that's the
			// beginning segment again at the end, since we opened it.
			this.addSegment(segs[0]);
			return path;
		}
		return null;
	},

	/**
	 * Reverses the orientation of the path, by reversing all its segments.
	 */
	reverse: function() {
		this._segments.reverse();
		// Reverse the handles:
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var segment = this._segments[i];
			var handleIn = segment._handleIn;
			segment._handleIn = segment._handleOut;
			segment._handleOut = handleIn;
			segment._index = i;
		}
		// Clear curves since it all has changed.
		this._curves = null;
		// Flip clockwise state if it's defined
		if (this._clockwise !== undefined)
			this._clockwise = !this._clockwise;
		this._changed(9);
	},

	// DOCS: document Path#join(path) in more detail.
	// DOCS: document Path#join() (joining with itself)
	// TODO: Consider adding a distance / tolerance parameter for merging.
	/**
	 * Joins the path with the specified path, which will be removed in the
	 * process.
	 *
	 * @param {Path} path the path to join this path with
	 * @return {Path} the joined path
	 *
	 * @example {@paperscript}
	 * // Joining two paths:
	 * var path = new Path({
	 *	   segments: [[30, 25], [30, 75]],
	 *	   strokeColor: 'black'
	 * });
	 *
	 * var path2 = new Path({
	 *	   segments: [[200, 25], [200, 75]],
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Join the paths:
	 * path.join(path2);
	 *
	 * @example {@paperscript}
	 * // Joining two paths that share a point at the start or end of their
	 * // segments array:
	 * var path = new Path({
	 *	   segments: [[30, 25], [30, 75]],
	 *	   strokeColor: 'black'
	 * });
	 *
	 * var path2 = new Path({
	 *	   segments: [[30, 25], [80, 25]],
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Join the paths:
	 * path.join(path2);
	 *
	 * // After joining, path with have 3 segments, since it
	 * // shared its first segment point with the first
	 * // segment point of path2.
	 *
	 * // Select the path to show that they have joined:
	 * path.selected = true;
	 *
	 * @example {@paperscript}
	 * // Joining two paths that connect at two points:
	 * var path = new Path({
	 *	   segments: [[30, 25], [80, 25], [80, 75]],
	 *	   strokeColor: 'black'
	 * });
	 *
	 * var path2 = new Path({
	 *	   segments: [[30, 25], [30, 75], [80, 75]],
	 *	   strokeColor: 'black'
	 * });
	 *
	 * // Join the paths:
	 * path.join(path2);
	 *
	 * // Because the paths were joined at two points, the path is closed
	 * // and has 4 segments.
	 *
	 * // Select the path to show that they have joined:
	 * path.selected = true;
	 */
	join: function(path) {
		if (path) {
			var segments = path._segments,
				last1 = this.getLastSegment(),
				last2 = path.getLastSegment();
			if (!last2) // an empty path?
				return this;
			if (last1 && last1._point.equals(last2._point))
				path.reverse();
			var first2 = path.getFirstSegment();
			if (last1 && last1._point.equals(first2._point)) {
				last1.setHandleOut(first2._handleOut);
				this._add(segments.slice(1));
			} else {
				var first1 = this.getFirstSegment();
				if (first1 && first1._point.equals(first2._point))
					path.reverse();
				last2 = path.getLastSegment();
				if (first1 && first1._point.equals(last2._point)) {
					first1.setHandleIn(last2._handleIn);
					// Prepend all segments from path except the last one.
					this._add(segments.slice(0, segments.length - 1), 0);
				} else {
					this._add(segments.slice());
				}
			}
			if (path._closed)
				this._add([segments[0]]);
			path.remove();
		}
		// Close the resulting path and merge first and last segment if they
		// touch, meaning the touched at path ends. Also do this if no path
		// argument was provided, in which cases the path is joined with itself
		// only if its ends touch.
		var first = this.getFirstSegment(),
			last = this.getLastSegment();
		if (first !== last && first._point.equals(last._point)) {
			first.setHandleIn(last._handleIn);
			last.remove();
			this.setClosed(true);
		}
		return this;
	},

	/**
	 * Attempts to create a new shape item with same geometry as this path item,
	 * and inherits all settings from it, similar to {@link Item#clone()}.
	 *
	 * @param {Boolean} [insert=true] specifies whether the new shape should be
	 * inserted into the DOM. When set to {@code true}, it is inserted above the
	 * path item
	 * @return {Shape} the newly created shape item with the same geometry as
	 * this path item if it can be matched, {@code null} otherwise
	 * @see Shape#toPath(insert)
	 */
	toShape: function(insert) {
		if (!this._closed)
			return null;

		var segments = this._segments,
			type,
			size,
			radius,
			topCenter;

		function isCollinear(i, j) {
			var seg1 = segments[i],
				seg2 = seg1.getNext(),
				seg3 = segments[j],
				seg4 = seg3.getNext();
			return seg1._handleOut.isZero() && seg2._handleIn.isZero()
					&& seg3._handleOut.isZero() && seg4._handleIn.isZero()
					&& seg2._point.subtract(seg1._point).isCollinear(
						seg4._point.subtract(seg3._point));
		}

		function isOrthogonal(i) {
			var seg2 = segments[i],
				seg1 = seg2.getPrevious(),
				seg3 = seg2.getNext();
			return seg1._handleOut.isZero() && seg2._handleIn.isZero()
					&& seg2._handleOut.isZero() && seg3._handleIn.isZero()
					&& seg2._point.subtract(seg1._point).isOrthogonal(
						seg3._point.subtract(seg2._point));
		}

		function isArc(i) {
			var seg1 = segments[i],
				seg2 = seg1.getNext(),
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn,
				kappa = 0.5522847498307936;
			// Look at handle length and the distance to the imaginary corner
			// point and see if it their relation is kappa.
			if (handle1.isOrthogonal(handle2)) {
				var pt1 = seg1._point,
					pt2 = seg2._point,
					// Find the corner point by intersecting the lines described
					// by both handles:
					corner = new Line(pt1, handle1, true).intersect(
							new Line(pt2, handle2, true), true);
				return corner && Numerical.isZero(handle1.getLength() /
						corner.subtract(pt1).getLength() - kappa)
					&& Numerical.isZero(handle2.getLength() /
						corner.subtract(pt2).getLength() - kappa);
			}
			return false;
		}

		function getDistance(i, j) {
			return segments[i]._point.getDistance(segments[j]._point);
		}

		// See if actually have any curves in the path. Differentiate
		// between straight objects (line, polyline, rect, and	polygon) and
		// objects with curves(circle, ellipse, roundedRectangle).
		if (!this.hasHandles() && segments.length === 4
				&& isCollinear(0, 2) && isCollinear(1, 3) && isOrthogonal(1)) {
			type = Shape.Rectangle;
			size = new Size(getDistance(0, 3), getDistance(0, 1));
			topCenter = segments[1]._point.add(segments[2]._point).divide(2);
		} else if (segments.length === 8 && isArc(0) && isArc(2) && isArc(4)
				&& isArc(6) && isCollinear(1, 5) && isCollinear(3, 7)) {
			// It's a rounded rectangle.
			type = Shape.Rectangle;
			size = new Size(getDistance(1, 6), getDistance(0, 3));
			// Subtract side lengths from total width and divide by 2 to get the
			// corner radius size.
			radius = size.subtract(new Size(getDistance(0, 7),
					getDistance(1, 2))).divide(2);
			topCenter = segments[3]._point.add(segments[4]._point).divide(2);
		} else if (segments.length === 4
				&& isArc(0) && isArc(1) && isArc(2) && isArc(3)) {
			// If the distance between (point0 and point2) and (point1
			// and point3) are equal, then it is a circle
			if (Numerical.isZero(getDistance(0, 2) - getDistance(1, 3))) {
				type = Shape.Circle;
				radius = getDistance(0, 2) / 2;
			} else {
				type = Shape.Ellipse;
				radius = new Size(getDistance(2, 0) / 2, getDistance(3, 1) / 2);
			}
			topCenter = segments[1]._point;
		}

		if (type) {
			var center = this.getPosition(true),
				shape = this._clone(new type({
					center: center,
					size: size,
					radius: radius,
					insert: false
				}), insert, false);
			// Determine and apply the shape's angle of rotation.
			shape.rotate(topCenter.subtract(center).getAngle() + 90);
			return shape;
		}
		return null;
	},

	_hitTestSelf: function(point, options) {
		var that = this,
			style = this.getStyle(),
			segments = this._segments,
			numSegments = segments.length,
			closed = this._closed,
			// transformed tolerance padding, see Item#hitTest. We will add
			// stroke padding on top if stroke is defined.
			tolerancePadding = options._tolerancePadding,
			strokePadding = tolerancePadding,
			join, cap, miterLimit,
			area, loc, res,
			hitStroke = options.stroke && style.hasStroke(),
			hitFill = options.fill && style.hasFill(),
			hitCurves = options.curves,
			radius = hitStroke
					? style.getStrokeWidth() / 2
					// Set radius to 0 when we're hit-testing fills with
					// tolerance, to handle tolerance through stroke hit-test
					// functionality. Also use 0 when hit-testing curves.
					: hitFill && options.tolerance > 0 || hitCurves
						? 0 : null;
		if (radius !== null) {
			if (radius > 0) {
				join = style.getStrokeJoin();
				cap = style.getStrokeCap();
				miterLimit = radius * style.getMiterLimit();
				// Add the stroke radius to tolerance padding.
				strokePadding = tolerancePadding.add(new Point(radius, radius));
			} else {
				join = cap = 'round';
			}
			// Using tolerance padding for fill tests will also work if there is
			// no stroke, in which case radius = 0 and we will test for stroke
			// locations to extend the fill area by tolerance.
		}

		function isCloseEnough(pt, padding) {
			return point.subtract(pt).divide(padding).length <= 1;
		}

		function checkSegmentPoint(seg, pt, name) {
			if (!options.selected || pt.isSelected()) {
				var anchor = seg._point;
				if (pt !== anchor)
					pt = pt.add(anchor);
				if (isCloseEnough(pt, strokePadding)) {
					return new HitResult(name, that, {
						segment: seg,
						point: pt
					});
				}
			}
		}

		function checkSegmentPoints(seg, ends) {
			// Note, when checking for ends, we don't also check for handles,
			// since this will happen afterwards in a separate loop, see below.
			return (ends || options.segments)
				&& checkSegmentPoint(seg, seg._point, 'segment')
				|| (!ends && options.handles) && (
					checkSegmentPoint(seg, seg._handleIn, 'handle-in') ||
					checkSegmentPoint(seg, seg._handleOut, 'handle-out'));
		}

		// Code to check stroke join / cap areas

		function addToArea(point) {
			area.add(point);
		}

		function checkSegmentStroke(segment) {
			// Handle joins / caps that are not round specificelly, by
			// hit-testing their polygon areas.
			if (join !== 'round' || cap !== 'round') {
				// Create an 'internal' path without id and outside the DOM
				// to run the hit-test on it.
				area = new Path({ internal: true, closed: true });
				if (closed || segment._index > 0
						&& segment._index < numSegments - 1) {
					// It's a join. See that it's not a round one (one of
					// the handles has to be zero too for this!)
					if (join !== 'round' && (segment._handleIn.isZero()
							|| segment._handleOut.isZero()))
						// _addBevelJoin() handles both 'bevel' and 'miter'!
						Path._addBevelJoin(segment, join, radius, miterLimit,
								addToArea, true);
				} else if (cap !== 'round') {
					// It's a cap
					Path._addSquareCap(segment, cap, radius, addToArea, true);
				}
				// See if the above produced an area to check for
				if (!area.isEmpty()) {
					// Also use stroke check with tolerancePadding if the point
					// is not inside the area itself, to use test caps and joins
					// with same tolerance.
					var loc;
					return area.contains(point)
						|| (loc = area.getNearestLocation(point))
							&& isCloseEnough(loc.getPoint(), tolerancePadding);
				}
			}
			// Fallback scenario is a round join / cap.
			return isCloseEnough(segment._point, strokePadding);
		}

		// If we're asked to query for segments, ends or handles, do all that
		// before stroke or fill.
		if (options.ends && !options.segments && !closed) {
			if (res = checkSegmentPoints(segments[0], true)
					|| checkSegmentPoints(segments[numSegments - 1], true))
				return res;
		} else if (options.segments || options.handles) {
			for (var i = 0; i < numSegments; i++)
				if (res = checkSegmentPoints(segments[i]))
					return res;
		}
		// If we're querying for stroke, perform that before fill
		if (radius !== null) {
			loc = this.getNearestLocation(point);
			// Note that paths need at least two segments to have an actual
			// stroke. But we still check for segments with the radius fallback
			// check if there is only one segment.
			if (loc) {
				// Now see if we're on a segment, and if so, check for its
				// stroke join / cap first. If not, do a normal radius check
				// for round strokes.
				var parameter = loc.getParameter();
				if (parameter === 0 || parameter === 1 && numSegments > 1) {
					if (!checkSegmentStroke(loc.getSegment()))
						loc = null;
				} else if (!isCloseEnough(loc.getPoint(), strokePadding)) {
					loc = null;
				}
			}
			// If we have miter joins, we may not be done yet, since they can be
			// longer than the radius. Check for each segment within reach now.
			if (!loc && join === 'miter' && numSegments > 1) {
				for (var i = 0; i < numSegments; i++) {
					var segment = segments[i];
					if (point.getDistance(segment._point) <= miterLimit
							&& checkSegmentStroke(segment)) {
						loc = segment.getLocation();
						break;
					}
				}
			}
		}
		// Don't process loc yet, as we also need to query for stroke after fill
		// in some cases. Simply skip fill query if we already have a matching
		// stroke. If we have a loc and no stroke then it's a result for fill.
		return !loc && hitFill && this._contains(point)
				|| loc && !hitStroke && !hitCurves
					? new HitResult('fill', this)
					: loc
						? new HitResult(hitStroke ? 'stroke' : 'curve', this, {
							location: loc,
							// It's fine performance wise to call getPoint()
							// again since it was already called before.
							point: loc.getPoint()
						})
						: null;
	}

	// TODO: intersects(item)
	// TODO: contains(item)
}, Base.each(Curve.evaluateMethods,
	function(name) {
		this[name + 'At'] = function(offset, isParameter) {
			var loc = this.getLocationAt(offset, isParameter);
			return loc && loc[name]();
		};
	},
/** @lends Path# */{
	// Explicitly deactivate the creation of beans, as we have functions here
	// that look like bean getters but actually read arguments.
	// See #getLocationOf(), #getNearestLocation(), #getNearestPoint()
	beans: false,

	/**
	 * {@grouptitle Positions on Paths and Curves}
	 *
	 * Returns the curve location of the specified point if it lies on the
	 * path, {@code null} otherwise.
	 *
	 * @param {Point} point the point on the path
	 * @return {CurveLocation} the curve location of the specified point
	 */
	getLocationOf: function(/* point */) {
		var point = Point.read(arguments),
			curves = this.getCurves();
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getLocationOf(point);
			if (loc)
				return loc;
		}
		return null;
	},

	/**
	 * Returns the length of the path from its beginning up to up to the
	 * specified point if it lies on the path, {@code null} otherwise.
	 *
	 * @param {Point} point the point on the path
	 * @return {Number} the length of the path up to the specified point
	 */
	getOffsetOf: function(/* point */) {
		var loc = this.getLocationOf.apply(this, arguments);
		return loc ? loc.getOffset() : null;
	},

	/**
	 * Returns the curve location of the specified offset on the path.
	 *
	 * @param {Number} offset the offset on the path, where {@code 0} is at
	 * the beginning of the path and {@link Path#length} at the end
	 * @param {Boolean} [isParameter=false]
	 * @return {CurveLocation} the curve location at the specified offset
	 */
	getLocationAt: function(offset, isParameter) {
		var curves = this.getCurves(),
			length = 0;
		if (isParameter) {
			// offset consists of curve index and curve parameter, before and
			// after the fractional digit.
			var index = ~~offset, // = Math.floor()
				curve = curves[index];
			return curve ? curve.getLocationAt(offset - index, true) : null;
		}
		for (var i = 0, l = curves.length; i < l; i++) {
			var start = length,
				curve = curves[i];
			length += curve.getLength();
			if (length > offset) {
				// Found the segment within which the length lies
				return curve.getLocationAt(offset - start);
			}
		}
		// It may be that through imprecision of getLength, that the end of the
		// last curve was missed:
		if (curves.length > 0 && offset <= this.getLength())
			return new CurveLocation(curves[curves.length - 1], 1);
		return null;
	},

	/**
	 * Calculates the point on the path at the given offset.
	 *
	 * @name Path#getPointAt
	 * @function
	 * @param {Number} offset the offset on the path, where {@code 0} is at
	 * the beginning of the path and {@link Path#length} at the end
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the point at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Finding the point on a path at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * // We're going to be working with a third of the length
	 * // of the path as the offset:
	 * var offset = path.length / 3;
	 *
	 * // Find the point on the path:
	 * var point = path.getPointAt(offset);
	 *
	 * // Create a small circle shaped path at the point:
	 * var circle = new Path.Circle({
	 *	   center: point,
	 *	   radius: 3,
	 *	   fillColor: 'red'
	 * });
	 *
	 * @example {@paperscript height=150}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 5;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 *	   var offset = i / amount * length;
	 *
	 *	   // Find the point on the path at the given offset:
	 *	   var point = path.getPointAt(offset);
	 *
	 *	   // Create a small circle shaped path at the point:
	 *	   var circle = new Path.Circle({
	 *		   center: point,
	 *		   radius: 3,
	 *		   fillColor: 'red'
	 *	   });
	 * }
	 */

	/**
	 * Calculates the normalized tangent vector of the path at the given offset.
	 *
	 * @name Path#getTangentAt
	 * @function
	 * @param {Number} offset the offset on the path, where {@code 0} is at
	 * the beginning of the path and {@link Path#length} at the end
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the normalized tangent vector at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Working with the tangent vector at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * // We're going to be working with a third of the length
	 * // of the path as the offset:
	 * var offset = path.length / 3;
	 *
	 * // Find the point on the path:
	 * var point = path.getPointAt(offset);
	 *
	 * // Find the tangent vector at the given offset
	 * // and give it a length of 60:
	 * var tangent = path.getTangentAt(offset) * 60;
	 *
	 * var line = new Path({
	 *	   segments: [point, point + tangent],
	 *	   strokeColor: 'red'
	 * })
	 *
	 * @example {@paperscript height=200}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 6;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 *	   var offset = i / amount * length;
	 *
	 *	   // Find the point on the path at the given offset:
	 *	   var point = path.getPointAt(offset);
	 *
	 *	   // Find the tangent vector on the path at the given offset
	 *	   // and give it a length of 60:
	 *	   var tangent = path.getTangentAt(offset) * 60;
	 *
	 *	   var line = new Path({
	 *		   segments: [point, point + tangent],
	 *		   strokeColor: 'red'
	 *	   })
	 * }
	 */

	/**
	 * Calculates the normal vector of the path at the given offset.
	 *
	 * @name Path#getNormalAt
	 * @function
	 * @param {Number} offset the offset on the path, where {@code 0} is at
	 * the beginning of the path and {@link Path#length} at the end
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the normal vector at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Working with the normal vector at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * // We're going to be working with a third of the length
	 * // of the path as the offset:
	 * var offset = path.length / 3;
	 *
	 * // Find the point on the path:
	 * var point = path.getPointAt(offset);
	 *
	 * // Find the normal vector on the path at the given offset
	 * // and give it a length of 30:
	 * var normal = path.getNormalAt(offset) * 30;
	 *
	 * var line = new Path({
	 *	   segments: [point, point + normal],
	 *	   strokeColor: 'red'
	 * });
	 *
	 * @example {@paperscript height=200}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 *	   strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 10;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 *	   var offset = i / amount * length;
	 *
	 *	   // Find the point on the path at the given offset:
	 *	   var point = path.getPointAt(offset);
	 *
	 *	   // Find the normal vector on the path at the given offset
	 *	   // and give it a length of 30:
	 *	   var normal = path.getNormalAt(offset) * 30;
	 *
	 *	   var line = new Path({
	 *		   segments: [point, point + normal],
	 *		   strokeColor: 'red'
	 *	   });
	 * }
	 */

	/**
	 * Calculates the weighted tangent vector of the path at the given offset.
	 *
	 * @name Path#getWeightedTangentAt
	 * @function
	 * @param {Number} offset the offset on the path, where {@code 0} is at
	 * the beginning of the path and {@link Path#length} at the end
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the weighted tangent vector at the given offset
	 */

	/**
	 * Calculates the weighted normal vector of the path at the given offset.
	 *
	 * @name Path#getWeightedNormalAt
	 * @function
	 * @param {Number} offset the offset on the path, where {@code 0} is at
	 * the beginning of the path and {@link Path#length} at the end
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the weighted normal vector at the given offset
	 */

	/**
	 * Calculates the curvature of the path at the given offset. Curvatures
	 * indicate how sharply a path changes direction. A straight line has zero
	 * curvature, where as a circle has a constant curvature. The path's radius
	 * at the given offset is the reciprocal value of its curvature.
	 *
	 * @name Path#getCurvatureAt
	 * @function
	 * @param {Number} offset the offset on the path, where {@code 0} is at
	 * the beginning of the path and {@link Path#length} at the end
	 * @param {Boolean} [isParameter=false]
	 * @return {Number} the normal vector at the given offset
	 */

	/**
	 * Returns the nearest location on the path to the specified point.
	 *
	 * @function
	 * @param {Point} point the point for which we search the nearest location
	 * @return {CurveLocation} the location on the path that's the closest to
	 * the specified point
	 */
	getNearestLocation: function(/* point */) {
		var point = Point.read(arguments),
			curves = this.getCurves(),
			minDist = Infinity,
			minLoc = null;
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getNearestLocation(point);
			if (loc._distance < minDist) {
				minDist = loc._distance;
				minLoc = loc;
			}
		}
		return minLoc;
	},

	/**
	 * Returns the nearest point on the path to the specified point.
	 *
	 * @function
	 * @param {Point} point the point for which we search the nearest point
	 * @return {Point} the point on the path that's the closest to the specified
	 * point
	 *
	 * @example {@paperscript height=200}
	 * var star = new Path.Star({
	 *	   center: view.center,
	 *	   points: 10,
	 *	   radius1: 30,
	 *	   radius2: 60,
	 *	   strokeColor: 'black'
	 * });
	 *
	 * var circle = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: 3,
	 *	   fillColor: 'red'
	 * });
	 *
	 * function onMouseMove(event) {
	 *	   // Get the nearest point from the mouse position
	 *	   // to the star shaped path:
	 *	   var nearestPoint = star.getNearestPoint(event.point);
	 *
	 *	   // Move the red circle to the nearest point:
	 *	   circle.position = nearestPoint;
	 * }
	 */
	getNearestPoint: function(/* point */) {
		return this.getNearestLocation.apply(this, arguments).getPoint();
	}
}),
new function() { // Scope for drawing
	// Note that in the code below we're often accessing _x and _y on point
	// objects that were read from segments. This is because the SegmentPoint
	// class overrides the plain x / y properties with getter / setters and
	// stores the values in these private properties internally. To avoid
	// calling of getter functions all the time we directly access these private
	// properties here. The distinction between normal Point objects and
	// SegmentPoint objects maybe seem a bit tedious but is worth the benefit in
	// performance.

	function drawHandles(ctx, segments, matrix, size) {
		var half = size / 2;

		function drawHandle(index) {
			var hX = coords[index],
				hY = coords[index + 1];
			if (pX != hX || pY != hY) {
				ctx.beginPath();
				ctx.moveTo(pX, pY);
				ctx.lineTo(hX, hY);
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(hX, hY, half, 0, Math.PI * 2, true);
				ctx.fill();
			}
		}

		var coords = new Array(6);
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords, false);
			var state = segment._selectionState,
				pX = coords[0],
				pY = coords[1];
			if (state & 1)
				drawHandle(2);
			if (state & 2)
				drawHandle(4);
			// Draw a rectangle at segment.point:
			ctx.fillRect(pX - half, pY - half, size, size);
			// If the point is not selected, draw a white square that is 1 px
			// smaller on all sides:
			if (!(state & 4)) {
				var fillStyle = ctx.fillStyle;
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(pX - half + 1, pY - half + 1, size - 2, size - 2);
				ctx.fillStyle = fillStyle;
			}
		}
	}

	function drawSegments(ctx, path, matrix) {
		var segments = path._segments,
			length = segments.length,
			coords = new Array(6),
			first = true,
			curX, curY,
			prevX, prevY,
			inX, inY,
			outX, outY;

		function drawSegment(segment) {
			// Optimise code when no matrix is provided by accessing segment
			// points hand handles directly, since this is the default when
			// drawing paths. Matrix is only used for drawing selections and
			// when #strokeScaling is false.
			if (matrix) {
				segment._transformCoordinates(matrix, coords, false);
				curX = coords[0];
				curY = coords[1];
			} else {
				var point = segment._point;
				curX = point._x;
				curY = point._y;
			}
			if (first) {
				ctx.moveTo(curX, curY);
				first = false;
			} else {
				if (matrix) {
					inX = coords[2];
					inY = coords[3];
				} else {
					var handle = segment._handleIn;
					inX = curX + handle._x;
					inY = curY + handle._y;
				}
				if (inX === curX && inY === curY
						&& outX === prevX && outY === prevY) {
					ctx.lineTo(curX, curY);
				} else {
					ctx.bezierCurveTo(outX, outY, inX, inY, curX, curY);
				}
			}
			prevX = curX;
			prevY = curY;
			if (matrix) {
				outX = coords[4];
				outY = coords[5];
			} else {
				var handle = segment._handleOut;
				outX = prevX + handle._x;
				outY = prevY + handle._y;
			}
		}

		for (var i = 0; i < length; i++)
			drawSegment(segments[i]);
		// Close path by drawing first segment again
		if (path._closed && length > 0)
			drawSegment(segments[0]);
	}

	return {
		_draw: function(ctx, param, strokeMatrix) {
			var dontStart = param.dontStart,
				dontPaint = param.dontFinish || param.clip,
				style = this.getStyle(),
				hasFill = style.hasFill(),
				hasStroke = style.hasStroke(),
				dashArray = style.getDashArray(),
				// dashLength is only set if we can't draw dashes natively
				dashLength = !paper.support.nativeDash && hasStroke
						&& dashArray && dashArray.length;

			if (!dontStart)
				ctx.beginPath();

			if (!dontStart && this._currentPath) {
				ctx.currentPath = this._currentPath;
			} else if (hasFill || hasStroke && !dashLength || dontPaint) {
				// Prepare the canvas path if we have any situation that
				// requires it to be defined.
				drawSegments(ctx, this, strokeMatrix);
				if (this._closed)
					ctx.closePath();
				// CompoundPath collects its own _currentPath
				if (!dontStart)
					this._currentPath = ctx.currentPath;
			}

			function getOffset(i) {
				// Negative modulo is necessary since we're stepping back
				// in the dash sequence first.
				return dashArray[((i % dashLength) + dashLength) % dashLength];
			}

			if (!dontPaint && (hasFill || hasStroke)) {
				// If the path is part of a compound path or doesn't have a fill
				// or stroke, there is no need to continue.
				this._setStyles(ctx);
				if (hasFill) {
					ctx.fill(style.getWindingRule());
					// If shadowColor is defined, clear it after fill, so it
					// won't be applied to both fill and stroke. If the path is
					// only stroked, we don't have to clear it.
					ctx.shadowColor = 'rgba(0,0,0,0)';
				}
				if (hasStroke) {
					if (dashLength) {
						// We cannot use the path created by drawSegments above
						// Use PathIterator to draw dashed paths:
						// NOTE: We don't cache this path in another currentPath
						// since browsers that support currentPath also support
						// native dashes.
						if (!dontStart)
							ctx.beginPath();
						var iterator = new PathIterator(this, 32, 0.25,
								strokeMatrix),
							length = iterator.length,
							from = -style.getDashOffset(), to,
							i = 0;
						from = from % length;
						// Step backwards in the dash sequence first until the
						// from parameter is below 0.
						while (from > 0) {
							from -= getOffset(i--) + getOffset(i--);
						}
						while (from < length) {
							to = from + getOffset(i++);
							if (from > 0 || to > 0)
								iterator.drawPart(ctx,
										Math.max(from, 0), Math.max(to, 0));
							from = to + getOffset(i++);
						}
					}
					ctx.stroke();
				}
			}
		},

		_drawSelected: function(ctx, matrix) {
			ctx.beginPath();
			drawSegments(ctx, this, matrix);
			// Now stroke it and draw its handles:
			ctx.stroke();
			drawHandles(ctx, this._segments, matrix, paper.settings.handleSize);
		}
	};
},
new function() { // Path Smoothing
	/**
	 * Solves a tri-diagonal system for one of coordinates (x or y) of first
	 * bezier control points.
	 *
	 * @param rhs right hand side vector
	 * @return Solution vector
	 */
	function getFirstControlPoints(rhs) {
		var n = rhs.length,
			x = [], // Solution vector.
			tmp = [], // Temporary workspace.
			b = 2;
		x[0] = rhs[0] / b;
		// Decomposition and forward substitution.
		for (var i = 1; i < n; i++) {
			tmp[i] = 1 / b;
			b = (i < n - 1 ? 4 : 2) - tmp[i];
			x[i] = (rhs[i] - x[i - 1]) / b;
		}
		// Back-substitution.
		for (var i = 1; i < n; i++) {
			x[n - i - 1] -= tmp[n - i] * x[n - i];
		}
		return x;
	}

	return {
		// Note: Documentation for smooth() is in PathItem
		smooth: function() {
			// This code is based on the work by Oleg V. Polikarpotchkin,
			// http://ov-p.spaces.live.com/blog/cns!39D56F0C7A08D703!147.entry
			// It was extended to support closed paths by averaging overlapping
			// beginnings and ends. The result of this approach is very close to
			// Polikarpotchkin's closed curve solution, but reuses the same
			// algorithm as for open paths, and is probably executing faster as
			// well, so it is preferred.
			var segments = this._segments,
				size = segments.length,
				closed = this._closed,
				n = size,
				// Add overlapping ends for averaging handles in closed paths
				overlap = 0;
			if (size <= 2)
				return;
			if (closed) {
				// Overlap up to 4 points since averaging beziers affect the 4
				// neighboring points
				overlap = Math.min(size, 4);
				n += Math.min(size, overlap) * 2;
			}
			var knots = [];
			for (var i = 0; i < size; i++)
				knots[i + overlap] = segments[i]._point;
			if (closed) {
				// If we're averaging, add the 4 last points again at the
				// beginning, and the 4 first ones at the end.
				for (var i = 0; i < overlap; i++) {
					knots[i] = segments[i + size - overlap]._point;
					knots[i + size + overlap] = segments[i]._point;
				}
			} else {
				n--;
			}
			// Calculate first Bezier control points
			// Right hand side vector
			var rhs = [];

			// Set right hand side X values
			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._x + 2 * knots[i + 1]._x;
			rhs[0] = knots[0]._x + 2 * knots[1]._x;
			rhs[n - 1] = 3 * knots[n - 1]._x;
			// Get first control points X-values
			var x = getFirstControlPoints(rhs);

			// Set right hand side Y values
			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._y + 2 * knots[i + 1]._y;
			rhs[0] = knots[0]._y + 2 * knots[1]._y;
			rhs[n - 1] = 3 * knots[n - 1]._y;
			// Get first control points Y-values
			var y = getFirstControlPoints(rhs);

			if (closed) {
				// Do the actual averaging simply by linearly fading between the
				// overlapping values.
				for (var i = 0, j = size; i < overlap; i++, j++) {
					var f1 = i / overlap,
						f2 = 1 - f1,
						ie = i + overlap,
						je = j + overlap;
					// Beginning
					x[j] = x[i] * f1 + x[j] * f2;
					y[j] = y[i] * f1 + y[j] * f2;
					// End
					x[je] = x[ie] * f2 + x[je] * f1;
					y[je] = y[ie] * f2 + y[je] * f1;
				}
				n--;
			}
			var handleIn = null;
			// Now set the calculated handles
			for (var i = overlap; i <= n - overlap; i++) {
				var segment = segments[i - overlap];
				if (handleIn)
					segment.setHandleIn(handleIn.subtract(segment._point));
				if (i < n) {
					segment.setHandleOut(
							new Point(x[i], y[i]).subtract(segment._point));
					handleIn = i < n - 1
							? new Point(
								2 * knots[i + 1]._x - x[i + 1],
								2 * knots[i + 1]._y - y[i + 1])
							: new Point(
								(knots[n]._x + x[n - 1]) / 2,
								(knots[n]._y + y[n - 1]) / 2);
				}
			}
			if (closed && handleIn) {
				var segment = this._segments[0];
				segment.setHandleIn(handleIn.subtract(segment._point));
			}
		}
	};
},
new function() { // PostScript-style drawing commands
	/**
	 * Helper method that returns the current segment and checks if a moveTo()
	 * command is required first.
	 */
	function getCurrentSegment(that) {
		var segments = that._segments;
		if (segments.length === 0)
			throw new Error('Use a moveTo() command first');
		return segments[segments.length - 1];
	}

	return {
		// Note: Documentation for these methods is found in PathItem, as they
		// are considered abstract methods of PathItem and need to be defined in
		// all implementing classes.
		moveTo: function(/* point */) {
			// moveTo should only be called at the beginning of paths. But it
			// can ce called again if there is nothing drawn yet, in which case
			// the first segment gets readjusted.
			var segments = this._segments;
			if (segments.length === 1)
				this.removeSegment(0);
			// Let's not be picky about calling moveTo() when not at the
			// beginning of a path, just bail out:
			if (!segments.length)
				this._add([ new Segment(Point.read(arguments)) ]);
		},

		moveBy: function(/* point */) {
			throw new Error('moveBy() is unsupported on Path items.');
		},

		lineTo: function(/* point */) {
			// Let's not be picky about calling moveTo() first:
			this._add([ new Segment(Point.read(arguments)) ]);
		},

		cubicCurveTo: function(/* handle1, handle2, to */) {
			var handle1 = Point.read(arguments),
				handle2 = Point.read(arguments),
				to = Point.read(arguments),
				// First modify the current segment:
				current = getCurrentSegment(this);
			// Convert to relative values:
			current.setHandleOut(handle1.subtract(current._point));
			// And add the new segment, with handleIn set to c2
			this._add([ new Segment(to, handle2.subtract(to)) ]);
		},

		quadraticCurveTo: function(/* handle, to */) {
			var handle = Point.read(arguments),
				to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			// This is exact:
			// If we have the three quad points: A E D,
			// and the cubic is A B C D,
			// B = E + 1/3 (A - E)
			// C = E + 1/3 (D - E)
			this.cubicCurveTo(
				handle.add(current.subtract(handle).multiply(1 / 3)),
				handle.add(to.subtract(handle).multiply(1 / 3)),
				to
			);
		},

		curveTo: function(/* through, to, parameter */) {
			var through = Point.read(arguments),
				to = Point.read(arguments),
				t = Base.pick(Base.read(arguments), 0.5),
				t1 = 1 - t,
				current = getCurrentSegment(this)._point,
				// handle = (through - (1 - t)^2 * current - t^2 * to) /
				// (2 * (1 - t) * t)
				handle = through.subtract(current.multiply(t1 * t1))
					.subtract(to.multiply(t * t)).divide(2 * t * t1);
			if (handle.isNaN())
				throw new Error(
					'Cannot put a curve through points with parameter = ' + t);
			this.quadraticCurveTo(handle, to);
		},

		arcTo: function(/* to, clockwise | through, to
				| to, radius, rotation, clockwise, large */) {
			// Get the start point:
			var current = getCurrentSegment(this),
				from = current._point,
				to = Point.read(arguments),
				through,
				// Peek at next value to see if it's clockwise, with true as the
				// default value.
				peek = Base.peek(arguments),
				clockwise = Base.pick(peek, true),
				center, extent, vector, matrix;
			// We're handling three different approaches to drawing arcs in one
			// large function:
			if (typeof clockwise === 'boolean') {
				// #1: arcTo(to, clockwise)
				var middle = from.add(to).divide(2),
				through = middle.add(middle.subtract(from).rotate(
						clockwise ? -90 : 90));
			} else if (Base.remain(arguments) <= 2) {
				// #2: arcTo(through, to)
				through = to;
				to = Point.read(arguments);
			} else {
				// #3: arcTo(to, radius, rotation, clockwise, large)
				// Drawing arcs in SVG style:
				var radius = Size.read(arguments);
				// If rx = 0 or ry = 0 then this arc is treated as a
				// straight line joining the endpoints.
				if (radius.isZero())
					return this.lineTo(to);
				// See for an explanation of the following calculations:
				// http://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
				var rotation = Base.read(arguments),
					clockwise = !!Base.read(arguments),
					large = !!Base.read(arguments),
					middle = from.add(to).divide(2),
					pt = from.subtract(middle).rotate(-rotation),
					x = pt.x,
					y = pt.y,
					abs = Math.abs,
					rx = abs(radius.width),
					ry = abs(radius.height),
					rxSq = rx * rx,
					rySq = ry * ry,
					xSq =  x * x,
					ySq =  y * y;
				// "...ensure radii are large enough"
				var factor = Math.sqrt(xSq / rxSq + ySq / rySq);
				if (factor > 1) {
					rx *= factor;
					ry *= factor;
					rxSq = rx * rx;
					rySq = ry * ry;
				}
				factor = (rxSq * rySq - rxSq * ySq - rySq * xSq) /
						(rxSq * ySq + rySq * xSq);
				if (abs(factor) < 1e-12)
					factor = 0;
				if (factor < 0)
					throw new Error(
							'Cannot create an arc with the given arguments');
				center = new Point(rx * y / ry, -ry * x / rx)
						// "...where the + sign is chosen if fA != fS,
						// and the - sign is chosen if fA = fS."
						.multiply((large === clockwise ? -1 : 1)
							* Math.sqrt(factor))
						.rotate(rotation).add(middle);
				// Now create a matrix that maps the unit circle to the ellipse,
				// for easier construction below.
				matrix = new Matrix().translate(center).rotate(rotation)
						.scale(rx, ry);
				// Transform from and to to the unit circle coordinate space
				// and calculate start vector and extend from there.
				vector = matrix._inverseTransform(from);
				extent = vector.getDirectedAngle(matrix._inverseTransform(to));
				// "...if fS = 0 and extent is > 0, then subtract 360, whereas
				// if fS = 1 and extend is < 0, then add 360."
				if (!clockwise && extent > 0)
					extent -= 360;
				else if (clockwise && extent < 0)
					extent += 360;
			}
			if (through) {
				// Calculate center, vector and extend for non SVG versions:
				// Construct the two perpendicular middle lines to
				// (from, through) and (through, to), and intersect them to get
				// the center.
				var l1 = new Line(from.add(through).divide(2),
							through.subtract(from).rotate(90), true),
					l2 = new Line(through.add(to).divide(2),
							to.subtract(through).rotate(90), true),
					line = new Line(from, to),
					throughSide = line.getSide(through);
				center = l1.intersect(l2, true);
				// If the two lines are collinear, there cannot be an arc as the
				// circle is infinitely big and has no center point. If side is
				// 0, the connecting arc line of this huge circle is a line
				// between the two points, so we can use #lineTo instead.
				// Otherwise we bail out:
				if (!center) {
					if (!throughSide)
						return this.lineTo(to);
					throw new Error(
							'Cannot create an arc with the given arguments');
				}
				vector = from.subtract(center);
				extent = vector.getDirectedAngle(to.subtract(center));
				var centerSide = line.getSide(center);
				if (centerSide === 0) {
					// If the center is lying on the line, we might have gotten
					// the wrong sign for extent above. Use the sign of the side
					// of the through point.
					extent = throughSide * Math.abs(extent);
				} else if (throughSide === centerSide) {
					// If the center is on the same side of the line (from, to)
					// as the through point, we're extending bellow 180 degrees
					// and need to adapt extent.
					extent += extent < 0 ? 360 : -360;
				}
			}
			var ext = Math.abs(extent),
				count = ext >= 360 ? 4 : Math.ceil(ext / 90),
				inc = extent / count,
				half = inc * Math.PI / 360,
				z = 4 / 3 * Math.sin(half) / (1 + Math.cos(half)),
				segments = [];
			for (var i = 0; i <= count; i++) {
				// Explicitly use to point for last segment, since depending
				// on values the calculation adds imprecision:
				var pt = to,
					out = null;
				if (i < count) {
					out = vector.rotate(90).multiply(z);
					if (matrix) {
						pt = matrix._transformPoint(vector);
						out = matrix._transformPoint(vector.add(out))
								.subtract(pt);
					} else {
						pt = center.add(vector);
					}
				}
				if (i === 0) {
					// Modify startSegment
					current.setHandleOut(out);
				} else {
					// Add new Segment
					var _in = vector.rotate(-90).multiply(z);
					if (matrix) {
						_in = matrix._transformPoint(vector.add(_in))
								.subtract(pt);
					}
					segments.push(new Segment(pt, _in, out));
				}
				vector = vector.rotate(inc);
			}
			// Add all segments at once at the end for higher performance
			this._add(segments);
		},

		lineBy: function(/* to */) {
			var to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			this.lineTo(current.add(to));
		},

		curveBy: function(/* through, to, parameter */) {
			var through = Point.read(arguments),
				to = Point.read(arguments),
				parameter = Base.read(arguments),
				current = getCurrentSegment(this)._point;
			this.curveTo(current.add(through), current.add(to), parameter);
		},

		cubicCurveBy: function(/* handle1, handle2, to */) {
			var handle1 = Point.read(arguments),
				handle2 = Point.read(arguments),
				to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			this.cubicCurveTo(current.add(handle1), current.add(handle2),
					current.add(to));
		},

		quadraticCurveBy: function(/* handle, to */) {
			var handle = Point.read(arguments),
				to = Point.read(arguments),
				current = getCurrentSegment(this)._point;
			this.quadraticCurveTo(current.add(handle), current.add(to));
		},

		// TODO: Implement version for: (to, radius, rotation, clockwise, large)
		arcBy: function(/* to, clockwise | through, to */) {
			var current = getCurrentSegment(this)._point,
				point = current.add(Point.read(arguments)),
				// Peek at next value to see if it's clockwise, with true as
				// default value.
				clockwise = Base.pick(Base.peek(arguments), true);
			if (typeof clockwise === 'boolean') {
				this.arcTo(point, clockwise);
			} else {
				this.arcTo(point, current.add(Point.read(arguments)));
			}
		},

		closePath: function(join) {
			this.setClosed(true);
			if (join)
				this.join();
		}
	};
}, {  // A dedicated scope for the tricky bounds calculations
	// We define all the different getBounds functions as static methods on Path
	// and have #_getBounds directly access these. All static bounds functions
	// below have the same first four parameters: segments, closed, style,
	// matrix, so they can be called from #_getBounds() and also be used in
	// Curve. But not all of them use all these parameters, and some define
	// additional ones after.

	_getBounds: function(getter, matrix) {
		// See #draw() for an explanation of why we can access _style
		// properties directly here:
		return Path[getter](this._segments, this._closed, this.getStyle(),
				matrix);
	},

// Mess with indentation in order to get more line-space below:
statics: {
	/**
	 * Returns the bounding rectangle of the item excluding stroke width.
	 *
	 * @private
	 */
	getBounds: function(segments, closed, style, matrix, strokePadding) {
		var first = segments[0];
		// If there are no segments, return "empty" rectangle, just like groups,
		// since #bounds is assumed to never return null.
		if (!first)
			return new Rectangle();
		var coords = new Array(6),
			// Make coordinates for first segment available in prevCoords.
			prevCoords = first._transformCoordinates(matrix, new Array(6), false),
			min = prevCoords.slice(0, 2), // Start with values of first point
			max = min.slice(), // clone
			roots = new Array(2);

		function processSegment(segment) {
			segment._transformCoordinates(matrix, coords, false);
			for (var i = 0; i < 2; i++) {
				Curve._addBounds(
					prevCoords[i], // prev.point
					prevCoords[i + 4], // prev.handleOut
					coords[i + 2], // segment.handleIn
					coords[i], // segment.point,
					i, strokePadding ? strokePadding[i] : 0, min, max, roots);
			}
			// Swap coordinate buffers.
			var tmp = prevCoords;
			prevCoords = coords;
			coords = tmp;
		}

		for (var i = 1, l = segments.length; i < l; i++)
			processSegment(segments[i]);
		if (closed)
			processSegment(first);
		return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
	},

	/**
	 * Returns the bounding rectangle of the item including stroke width.
	 *
	 * @private
	 */
	getStrokeBounds: function(segments, closed, style, matrix) {
		// TODO: Find a way to reuse 'bounds' cache instead?
		if (!style.hasStroke())
			return Path.getBounds(segments, closed, style, matrix);
		var length = segments.length - (closed ? 0 : 1),
			radius = style.getStrokeWidth() / 2,
			padding = Path._getPenPadding(radius, matrix),
			bounds = Path.getBounds(segments, closed, style, matrix, padding),
			join = style.getStrokeJoin(),
			cap = style.getStrokeCap(),
			miterLimit = radius * style.getMiterLimit();
		// Create a rectangle of padding size, used for union with bounds
		// further down
		var joinBounds = new Rectangle(new Size(padding).multiply(2));

		function add(point) {
			bounds = bounds.include(matrix
				? matrix._transformPoint(point, point) : point);
		}

		function addRound(segment) {
			bounds = bounds.unite(joinBounds.setCenter(matrix
				? matrix._transformPoint(segment._point) : segment._point));
		}

		function addJoin(segment, join) {
			// When both handles are set in a segment and they are collinear,
			// the join setting is ignored and round is always used.
			var handleIn = segment._handleIn,
				handleOut = segment._handleOut;
			if (join === 'round' || !handleIn.isZero() && !handleOut.isZero()
					&& handleIn.isCollinear(handleOut)) {
				addRound(segment);
			} else {
				Path._addBevelJoin(segment, join, radius, miterLimit, add);
			}
		}

		function addCap(segment, cap) {
			if (cap === 'round') {
				addRound(segment);
			} else {
				Path._addSquareCap(segment, cap, radius, add);
			}
		}

		for (var i = 1; i < length; i++)
			addJoin(segments[i], join);
		if (closed) {
			addJoin(segments[0], join);
		} else if (length > 0) {
			addCap(segments[0], cap);
			addCap(segments[segments.length - 1], cap);
		}
		return bounds;
	},

	/**
	 * Returns the horizontal and vertical padding that a transformed round
	 * stroke adds to the bounding box, by calculating the dimensions of a
	 * rotated ellipse.
	 */
	_getPenPadding: function(radius, matrix) {
		if (!matrix)
			return [radius, radius];
		// If a matrix is provided, we need to rotate the stroke circle
		// and calculate the bounding box of the resulting rotated elipse:
		// Get rotated hor and ver vectors, and determine rotation angle
		// and elipse values from them:
		var mx = matrix.shiftless(),
			hor = mx.transform(new Point(radius, 0)),
			ver = mx.transform(new Point(0, radius)),
			phi = hor.getAngleInRadians(),
			a = hor.getLength(),
			b = ver.getLength();
		// Formula for rotated ellipses:
		// x = cx + a*cos(t)*cos(phi) - b*sin(t)*sin(phi)
		// y = cy + b*sin(t)*cos(phi) + a*cos(t)*sin(phi)
		// Derivates (by Wolfram Alpha):
		// derivative of x = cx + a*cos(t)*cos(phi) - b*sin(t)*sin(phi)
		// dx/dt = a sin(t) cos(phi) + b cos(t) sin(phi) = 0
		// derivative of y = cy + b*sin(t)*cos(phi) + a*cos(t)*sin(phi)
		// dy/dt = b cos(t) cos(phi) - a sin(t) sin(phi) = 0
		// This can be simplified to:
		// tan(t) = -b * tan(phi) / a // x
		// tan(t) =	 b * cot(phi) / a // y
		// Solving for t gives:
		// t = pi * n - arctan(b * tan(phi) / a) // x
		// t = pi * n + arctan(b * cot(phi) / a)
		//	 = pi * n + arctan(b / tan(phi) / a) // y
		var sin = Math.sin(phi),
			cos = Math.cos(phi),
			tan = Math.tan(phi),
			tx = -Math.atan(b * tan / a),
			ty = Math.atan(b / (tan * a));
		// Due to symetry, we don't need to cycle through pi * n solutions:
		return [Math.abs(a * Math.cos(tx) * cos - b * Math.sin(tx) * sin),
				Math.abs(b * Math.sin(ty) * cos + a * Math.cos(ty) * sin)];
	},

	_addBevelJoin: function(segment, join, radius, miterLimit, addPoint, area) {
		// Handles both 'bevel' and 'miter' joins, as they share a lot of code.
		var curve2 = segment.getCurve(),
			curve1 = curve2.getPrevious(),
			point = curve2.getPointAt(0, true),
			normal1 = curve1.getNormalAt(1, true),
			normal2 = curve2.getNormalAt(0, true),
			step = normal1.getDirectedAngle(normal2) < 0 ? -radius : radius;
		normal1.setLength(step);
		normal2.setLength(step);
		if (area) {
			addPoint(point);
			addPoint(point.add(normal1));
		}
		if (join === 'miter') {
			// Intersect the two lines
			var corner = new Line(
					point.add(normal1),
					new Point(-normal1.y, normal1.x), true
				).intersect(new Line(
					point.add(normal2),
					new Point(-normal2.y, normal2.x), true
				), true);
			// See if we actually get a bevel point and if its distance is below
			// the miterLimit. If not, make a normal bevel.
			if (corner && point.getDistance(corner) <= miterLimit) {
				addPoint(corner);
				if (!area)
					return;
			}
		}
		// Produce a normal bevel
		if (!area)
			addPoint(point.add(normal1));
		addPoint(point.add(normal2));
	},

	_addSquareCap: function(segment, cap, radius, addPoint, area) {
		// Handles both 'square' and 'butt' caps, as they share a lot of code.
		// Calculate the corner points of butt and square caps
		var point = segment._point,
			loc = segment.getLocation(),
			normal = loc.getNormal().multiply(radius); // normal is normalized
		if (area) {
			addPoint(point.subtract(normal));
			addPoint(point.add(normal));
		}
		// For square caps, we need to step away from point in the direction of
		// the tangent, which is the rotated normal.
		// Checking loc.getParameter() for 0 is to see whether this is the first
		// or the last segment of the open path, in order to determine in which
		// direction to move the point.
		if (cap === 'square')
			point = point.add(normal.rotate(loc.getParameter() === 0 ? -90 : 90));
		addPoint(point.add(normal));
		addPoint(point.subtract(normal));
	},

	/**
	 * Returns the bounding rectangle of the item including handles.
	 *
	 * @private
	 */
	getHandleBounds: function(segments, closed, style, matrix, strokePadding,
			joinPadding) {
		var coords = new Array(6),
			x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords, false);
			for (var j = 0; j < 6; j += 2) {
				// Use different padding for points or handles
				var padding = j === 0 ? joinPadding : strokePadding,
					paddingX = padding ? padding[0] : 0,
					paddingY = padding ? padding[1] : 0,
					x = coords[j],
					y = coords[j + 1],
					xn = x - paddingX,
					xx = x + paddingX,
					yn = y - paddingY,
					yx = y + paddingY;
				if (xn < x1) x1 = xn;
				if (xx > x2) x2 = xx;
				if (yn < y1) y1 = yn;
				if (yx > y2) y2 = yx;
			}
		}
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Returns the rough bounding rectangle of the item that is sure to include
	 * all of the drawing, including stroke width.
	 *
	 * @private
	 */
	getRoughBounds: function(segments, closed, style, matrix) {
		// Delegate to handleBounds, but pass on radius values for stroke and
		// joins. Hanlde miter joins specially, by passing the largets radius
		// possible.
		var strokeRadius = style.hasStroke() ? style.getStrokeWidth() / 2 : 0,
			joinRadius = strokeRadius;
		if (strokeRadius > 0) {
			if (style.getStrokeJoin() === 'miter')
				joinRadius = strokeRadius * style.getMiterLimit();
			if (style.getStrokeCap() === 'square')
				joinRadius = Math.max(joinRadius, strokeRadius * Math.sqrt(2));
		}
		return Path.getHandleBounds(segments, closed, style, matrix,
				Path._getPenPadding(strokeRadius, matrix),
				Path._getPenPadding(joinRadius, matrix));
	}
}});

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

Path.inject({ statics: new function() {

	var kappa = 0.5522847498307936,
		ellipseSegments = [
			new Segment([-1, 0], [0, kappa ], [0, -kappa]),
			new Segment([0, -1], [-kappa, 0], [kappa, 0 ]),
			new Segment([1, 0], [0, -kappa], [0, kappa ]),
			new Segment([0, 1], [kappa, 0 ], [-kappa, 0])
		];

	function createPath(segments, closed, args) {
		var props = Base.getNamed(args),
			path = new Path(props && props.insert === false && Item.NO_INSERT);
		path._add(segments);
		// No need to use setter for _closed since _add() called _changed().
		path._closed = closed;
		// Set named arguments at the end, since some depend on geometry to be
		// defined (e.g. #clockwise)
		return path.set(props);
	}

	function createEllipse(center, radius, args) {
		var segments = new Array(4);
		for (var i = 0; i < 4; i++) {
			var segment = ellipseSegments[i];
			segments[i] = new Segment(
				segment._point.multiply(radius).add(center),
				segment._handleIn.multiply(radius),
				segment._handleOut.multiply(radius)
			);
		}
		return createPath(segments, true, args);
	}


	return /** @lends Path */{
		/**
		 * {@grouptitle Shaped Paths}
		 *
		 * Creates a linear path item from two points describing a line.
		 *
		 * @name Path.Line
		 * @param {Point} from the line's starting point
		 * @param {Point} to the line's ending point
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var from = new Point(20, 20);
		 * var to = new Point(80, 80);
		 * var path = new Path.Line(from, to);
		 * path.strokeColor = 'black';
		 */
		/**
		 * Creates a linear path item from the properties described by an object
		 * literal.
		 *
		 * @name Path.Line
		 * @param {Object} object an object literal containing properties
		 * describing the path's attributes
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var path = new Path.Line({
		 *	   from: [20, 20],
		 *	   to: [80, 80],
		 *	   strokeColor: 'black'
		 * });
		 */
		Line: function(/* from, to */) {
			return createPath([
				new Segment(Point.readNamed(arguments, 'from')),
				new Segment(Point.readNamed(arguments, 'to'))
			], false, arguments);
		},

		/**
		 * Creates a circular path item.
		 *
		 * @name Path.Circle
		 * @param {Point} center the center point of the circle
		 * @param {Number} radius the radius of the circle
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var path = new Path.Circle(new Point(80, 50), 30);
		 * path.strokeColor = 'black';
		 */
		/**
		 * Creates a circular path item from the properties described by an
		 * object literal.
		 *
		 * @name Path.Circle
		 * @param {Object} object an object literal containing properties
		 * describing the path's attributes
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var path = new Path.Circle({
		 *	   center: [80, 50],
		 *	   radius: 30,
		 *	   strokeColor: 'black'
		 * });
		 */
		Circle: function(/* center, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return createEllipse(center, new Size(radius), arguments);
		},

		/**
		 * Creates a rectangular path item, with optionally rounded corners.
		 *
		 * @name Path.Rectangle
		 * @param {Rectangle} rectangle the rectangle object describing the
		 * geometry of the rectangular path to be created
		 * @param {Size} [radius=null] the size of the rounded corners
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
		 * var path = new Path.Rectangle(rectangle);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript} // The same, with rounder corners
		 * var rectangle = new Rectangle(new Point(20, 20), new Size(60, 60));
		 * var cornerSize = new Size(10, 10);
		 * var path = new Path.Rectangle(rectangle, cornerSize);
		 * path.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangular path item from a point and a size object.
		 *
		 * @name Path.Rectangle
		 * @param {Point} point the rectangle's top-left corner.
		 * @param {Size} size the rectangle's size.
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var point = new Point(20, 20);
		 * var size = new Size(60, 60);
		 * var path = new Path.Rectangle(point, size);
		 * path.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangular path item from the passed points. These do not
		 * necessarily need to be the top left and bottom right corners, the
		 * constructor figures out how to fit a rectangle between them.
		 *
		 * @name Path.Rectangle
		 * @param {Point} from the first point defining the rectangle
		 * @param {Point} to the second point defining the rectangle
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var from = new Point(20, 20);
		 * var to = new Point(80, 80);
		 * var path = new Path.Rectangle(from, to);
		 * path.strokeColor = 'black';
		 */
		/**
		 * Creates a rectangular path item from the properties described by an
		 * object literal.
		 *
		 * @name Path.Rectangle
		 * @param {Object} object an object literal containing properties
		 * describing the path's attributes
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var path = new Path.Rectangle({
		 *	   point: [20, 20],
		 *	   size: [60, 60],
		 *	   strokeColor: 'black'
		 * });
		 *
		 * @example {@paperscript}
		 * var path = new Path.Rectangle({
		 *	   from: [20, 20],
		 *	   to: [80, 80],
		 *	   strokeColor: 'black'
		 * });
		 *
		 * @example {@paperscript}
		 * var path = new Path.Rectangle({
		 *	   rectangle: {
		 *		   topLeft: [20, 20],
		 *		   bottomRight: [80, 80]
		 *	   },
		 *	   strokeColor: 'black'
		 * });
		 *
		 * @example {@paperscript}
		 * var path = new Path.Rectangle({
		 *	topLeft: [20, 20],
		 *	   bottomRight: [80, 80],
		 *	   radius: 10,
		 *	   strokeColor: 'black'
		 * });
		 */
		Rectangle: function(/* rectangle */) {
			var rect = Rectangle.readNamed(arguments, 'rectangle'),
				radius = Size.readNamed(arguments, 'radius', 0,
						{ readNull: true }),
				bl = rect.getBottomLeft(true),
				tl = rect.getTopLeft(true),
				tr = rect.getTopRight(true),
				br = rect.getBottomRight(true),
				segments;
			if (!radius || radius.isZero()) {
				segments = [
					new Segment(bl),
					new Segment(tl),
					new Segment(tr),
					new Segment(br)
				];
			} else {
				radius = Size.min(radius, rect.getSize(true).divide(2));
				var rx = radius.width,
					ry = radius.height,
					hx = rx * kappa,
					hy = ry * kappa;
				segments = [
					new Segment(bl.add(rx, 0), null, [-hx, 0]),
					new Segment(bl.subtract(0, ry), [0, hy]),
					new Segment(tl.add(0, ry), null, [0, -hy]),
					new Segment(tl.add(rx, 0), [-hx, 0], null),
					new Segment(tr.subtract(rx, 0), null, [hx, 0]),
					new Segment(tr.add(0, ry), [0, -hy], null),
					new Segment(br.subtract(0, ry), null, [0, hy]),
					new Segment(br.subtract(rx, 0), [hx, 0])
				];
			}
			return createPath(segments, true, arguments);
		},

		/**
		 * @deprecated use {@link #Path.Rectangle(rectangle, size)} instead.
		 */
		RoundRectangle: '#Rectangle',

		/**
		 * Creates an elliptical path item.
		 *
		 * @name Path.Ellipse
		 * @param {Rectangle} rectangle the rectangle circumscribing the ellipse
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle(new Point(20, 20), new Size(180, 60));
		 * var path = new Path.Ellipse(rectangle);
		 * path.fillColor = 'black';
		 */
		/**
		 * Creates an elliptical path item from the properties described by an
		 * object literal.
		 *
		 * @name Path.Ellipse
		 * @param {Object} object an object literal containing properties
		 * describing the path's attributes
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var path = new Path.Ellipse({
		 *	   point: [20, 20],
		 *	   size: [180, 60],
		 *	   fillColor: 'black'
		 * });
		 *
		 * @example {@paperscript} // Placing by center and radius
		 * var shape = new Path.Ellipse({
		 *	   center: [110, 50],
		 *	   radius: [90, 30],
		 *	   fillColor: 'black'
		 * });
		 */
		Ellipse: function(/* rectangle */) {
			var ellipse = Shape._readEllipse(arguments);
			return createEllipse(ellipse.center, ellipse.radius, arguments);
		},

		/**
		 * @deprecated use {@link #Path.Ellipse(rectangle)} instead.
		 */
		Oval: '#Ellipse',

		/**
		 * Creates a circular arc path item.
		 *
		 * @name Path.Arc
		 * @param {Point} from the starting point of the circular arc
		 * @param {Point} through the point the arc passes through
		 * @param {Point} to the end point of the arc
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var from = new Point(20, 20);
		 * var through = new Point(60, 20);
		 * var to = new Point(80, 80);
		 * var path = new Path.Arc(from, through, to);
		 * path.strokeColor = 'black';
		 *
		 */
		/**
		 * Creates an circular arc path item from the properties described by an
		 * object literal.
		 *
		 * @name Path.Arc
		 * @param {Object} object an object literal containing properties
		 * describing the path's attributes
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var path = new Path.Arc({
		 *	   from: [20, 20],
		 *	   through: [60, 20],
		 *	   to: [80, 80],
		 *	   strokeColor: 'black'
		 * });
		 */
		Arc: function(/* from, through, to */) {
			var from = Point.readNamed(arguments, 'from'),
				through = Point.readNamed(arguments, 'through'),
				to = Point.readNamed(arguments, 'to'),
				props = Base.getNamed(arguments),
				// See createPath() for an explanation of the following sequence
				path = new Path(props && props.insert === false
						&& Item.NO_INSERT);
			path.moveTo(from);
			path.arcTo(through, to);
			return path.set(props);
		},

		/**
		 * Creates a regular polygon shaped path item.
		 *
		 * @name Path.RegularPolygon
		 * @param {Point} center the center point of the polygon
		 * @param {Number} sides the number of sides of the polygon
		 * @param {Number} radius the radius of the polygon
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var center = new Point(50, 50);
		 * var sides = 3;
		 * var radius = 40;
		 * var triangle = new Path.RegularPolygon(center, sides, radius);
		 * triangle.fillColor = 'black';
		 */
		/**
		 * Creates a regular polygon shaped path item from the properties
		 * described by an object literal.
		 *
		 * @name Path.RegularPolygon
		 * @param {Object} object an object literal containing properties
		 * describing the path's attributes
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var triangle = new Path.RegularPolygon({
		 *	   center: [50, 50],
		 *	   sides: 10,
		 *	   radius: 40,
		 *	   fillColor: 'black'
		 * });
		 */
		RegularPolygon: function(/* center, sides, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				sides = Base.readNamed(arguments, 'sides'),
				radius = Base.readNamed(arguments, 'radius'),
				step = 360 / sides,
				three = !(sides % 3),
				vector = new Point(0, three ? -radius : radius),
				offset = three ? -1 : 0.5,
				segments = new Array(sides);
			for (var i = 0; i < sides; i++)
				segments[i] = new Segment(center.add(
					vector.rotate((i + offset) * step)));
			return createPath(segments, true, arguments);
		},

		/**
		 * Creates a star shaped path item.
		 *
		 * The largest of {@code radius1} and {@code radius2} will be the outer
		 * radius of the star. The smallest of radius1 and radius2 will be the
		 * inner radius.
		 *
		 * @name Path.Star
		 * @param {Point} center the center point of the star
		 * @param {Number} points the number of points of the star
		 * @param {Number} radius1
		 * @param {Number} radius2
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var center = new Point(50, 50);
		 * var points = 12;
		 * var radius1 = 25;
		 * var radius2 = 40;
		 * var path = new Path.Star(center, points, radius1, radius2);
		 * path.fillColor = 'black';
		 */
		/**
		 * Creates a star shaped path item from the properties described by an
		 * object literal.
		 *
		 * @name Path.Star
		 * @param {Object} object an object literal containing properties
		 * describing the path's attributes
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var path = new Path.Star({
		 *	   center: [50, 50],
		 *	   points: 12,
		 *	   radius1: 25,
		 *	   radius2: 40,
		 *	   fillColor: 'black'
		 * });
		 */
		Star: function(/* center, points, radius1, radius2 */) {
			var center = Point.readNamed(arguments, 'center'),
				points = Base.readNamed(arguments, 'points') * 2,
				radius1 = Base.readNamed(arguments, 'radius1'),
				radius2 = Base.readNamed(arguments, 'radius2'),
				step = 360 / points,
				vector = new Point(0, -1),
				segments = new Array(points);
			for (var i = 0; i < points; i++)
				segments[i] = new Segment(center.add(vector.rotate(step * i)
						.multiply(i % 2 ? radius2 : radius1)));
			return createPath(segments, true, arguments);
		}
	};
}});

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
 * @name CompoundPath
 *
 * @class A compound path contains two or more paths, holes are drawn
 * where the paths overlap. All the paths in a compound path take on the
 * style of the backmost path and can be accessed through its
 * {@link Item#children} list.
 *
 * @extends PathItem
 */
var CompoundPath = PathItem.extend(/** @lends CompoundPath# */{
	_class: 'CompoundPath',
	_serializeFields: {
		children: []
	},

	/**
	 * Creates a new compound path item and places it in the active layer.
	 *
	 * @param {Path[]} [paths] the paths to place within the compound path
	 *
	 * @example {@paperscript}
	 * // Create a circle shaped path with a hole in it:
	 * var circle = new Path.Circle({
	 *	   center: new Point(50, 50),
	 *	   radius: 30
	 * });
	 *
	 * var innerCircle = new Path.Circle({
	 *	   center: new Point(50, 50),
	 *	   radius: 10
	 * });
	 *
	 * var compoundPath = new CompoundPath([circle, innerCircle]);
	 * compoundPath.fillColor = 'red';
	 *
	 * // Move the inner circle 5pt to the right:
	 * compoundPath.children[1].position.x += 5;
	 */
	/**
	 * Creates a new compound path item from an object description and places it
	 * at the top of the active layer.
	 *
	 * @name CompoundPath#initialize
	 * @param {Object} object an object literal containing properties to
	 * be set on the path
	 * @return {CompoundPath} the newly created path
	 *
	 * @example {@paperscript}
	 * var path = new CompoundPath({
	 *	   children: [
	 *		   new Path.Circle({
	 *			   center: new Point(50, 50),
	 *			   radius: 30
	 *		   }),
	 *		   new Path.Circle({
	 *			   center: new Point(50, 50),
	 *			   radius: 10
	 *		   })
	 *	   ],
	 *	   fillColor: 'black',
	 *	   selected: true
	 * });
	 */
	/**
	 * Creates a new compound path item from SVG path-data and places it at the
	 * top of the active layer.
	 *
	 * @name CompoundPath#initialize
	 * @param {String} pathData the SVG path-data that describes the geometry
	 * of this path
	 * @return {CompoundPath} the newly created path
	 *
	 * @example {@paperscript}
	 * var pathData = 'M20,50c0,-16.56854 13.43146,-30 30,-30c16.56854,0 30,13.43146 30,30c0,16.56854 -13.43146,30 -30,30c-16.56854,0 -30,-13.43146 -30,-30z M50,60c5.52285,0 10,-4.47715 10,-10c0,-5.52285 -4.47715,-10 -10,-10c-5.52285,0 -10,4.47715 -10,10c0,5.52285 4.47715,10 10,10z';
	 * var path = new CompoundPath(pathData);
	 * path.fillColor = 'black';
	 */
	initialize: function CompoundPath(arg) {
		// CompoundPath has children and supports named children.
		this._children = [];
		this._namedChildren = {};
		if (!this._initialize(arg)) {
			if (typeof arg === 'string') {
				this.setPathData(arg);
			} else {
				this.addChildren(Array.isArray(arg) ? arg : arguments);
			}
		}
	},

	insertChildren: function insertChildren(index, items, _preserve) {
		// Convert CompoundPath items in the children list by adding their
		// children to the list and removing their parent.
		for (var i = items.length - 1; i >= 0; i--) {
			var item = items[i];
			if (item instanceof CompoundPath) {
				items.splice.apply(items, [i, 1].concat(item.removeChildren()));
				item.remove();
			}
		}
		// Pass on 'path' for _type, to make sure that only paths are added as
		// children.
		items = insertChildren.base.call(this, index, items, _preserve, Path);
		// All children except for the bottom one (first one in list) are set
		// to anti-clockwise orientation, so that they appear as holes, but
		// only if their orientation was not already specified before
		// (= _clockwise is defined).
		for (var i = 0, l = !_preserve && items && items.length; i < l; i++) {
			var item = items[i];
			if (item._clockwise === undefined)
				item.setClockwise(item._index === 0);
		}
		return items;
	},

	/**
	 * Reverses the orientation of all nested paths.
	 */
	reverse: function() {
		var children = this._children;
		for (var i = 0, l = children.length; i < l; i++)
			children[i].reverse();
	},

	smooth: function() {
		for (var i = 0, l = this._children.length; i < l; i++)
			this._children[i].smooth();
	},

	// DOCS: reduce()
	// TEST: reduce()
	reduce: function reduce() {
		var children = this._children;
		for (var i = children.length - 1; i >= 0; i--) {
			var path = children[i].reduce();
			if (path.isEmpty())
				children.splice(i, 1);
		}
		if (children.length === 0) { // Replace with a simple empty Path
			var path = new Path(Item.NO_INSERT);
			path.insertAbove(this);
			path.setStyle(this._style);
			this.remove();
			return path;
		}
		return reduce.base.call(this);
	},

	/**
	 * Specifies whether the compound path is oriented clock-wise.
	 *
	 * @type Boolean
	 * @bean
	 */
	isClockwise: function() {
		var child = this.getFirstChild();
		return child && child.isClockwise();
	},

	setClockwise: function(clockwise) {
		/*jshint -W018 */
		if (this.isClockwise() !== !!clockwise)
			this.reverse();
	},

	/**
	 * The first Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getFirstSegment: function() {
		var first = this.getFirstChild();
		return first && first.getFirstSegment();
	},

	/**
	 * The last Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getLastSegment: function() {
		var last = this.getLastChild();
		return last && last.getLastSegment();
	},

	/**
	 * All the curves contained within the compound-path, from all its child
	 * {@link Path} items.
	 *
	 * @type Curve[]
	 * @bean
	 */
	getCurves: function() {
		var children = this._children,
			curves = [];
		for (var i = 0, l = children.length; i < l; i++)
			curves.push.apply(curves, children[i].getCurves());
		return curves;
	},

	/**
	 * The first Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getFirstCurve: function() {
		var first = this.getFirstChild();
		return first && first.getFirstCurve();
	},

	/**
	 * The last Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getLastCurve: function() {
		var last = this.getLastChild();
		return last && last.getFirstCurve();
	},

	/**
	 * The area that the path's geometry is covering. Self-intersecting paths
	 * can contain sub-areas that cancel each other out.
	 *
	 * @type Number
	 * @bean
	 */
	getArea: function() {
		var children = this._children,
			area = 0;
		for (var i = 0, l = children.length; i < l; i++)
			area += children[i].getArea();
		return area;
	}
}, /** @lends CompoundPath# */{
	// Enforce bean creation for getPathData(), as it has hidden parameters.
	beans: true,

	getPathData: function(_matrix, _precision) {
		// NOTE: #setPathData() is defined in PathItem.
		var children = this._children,
			paths = [];
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i],
				mx = child._matrix;
			paths.push(child.getPathData(_matrix && !mx.isIdentity()
					? _matrix.chain(mx) : _matrix, _precision));
		}
		return paths.join(' ');
	}
}, /** @lends CompoundPath# */{
	_getChildHitTestOptions: function(options) {
		// If we're not specifically asked to returns paths through
		// options.class == Path, do not test children for fill, since a
		// compound path forms one shape.
		// Also support legacy format `type: 'path'`.
		return options.class === Path || options.type === 'path'
				? options
				: new Base(options, { fill: false });
	},

	_draw: function(ctx, param, strokeMatrix) {
		var children = this._children;
		// Return early if the compound path doesn't have any children:
		if (children.length === 0)
			return;

		if (this._currentPath) {
			ctx.currentPath = this._currentPath;
		} else {
			param = param.extend({ dontStart: true, dontFinish: true });
			ctx.beginPath();
			for (var i = 0, l = children.length; i < l; i++)
				children[i].draw(ctx, param, strokeMatrix);
			this._currentPath = ctx.currentPath;
		}

		if (!param.clip) {
			this._setStyles(ctx);
			var style = this._style;
			if (style.hasFill()) {
				ctx.fill(style.getWindingRule());
				ctx.shadowColor = 'rgba(0,0,0,0)';
			}
			if (style.hasStroke())
				ctx.stroke();
		}
	},

	_drawSelected: function(ctx, matrix, selectedItems) {
		var children = this._children;
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i],
				mx = child._matrix;
			if (!selectedItems[child._id])
				child._drawSelected(ctx, mx.isIdentity() ? matrix
						: matrix.chain(mx));
		}
	}
},
new function() { // Injection scope for PostScript-like drawing functions
	/**
	 * Helper method that returns the current path and checks if a moveTo()
	 * command is required first.
	 */
	function getCurrentPath(that, check) {
		var children = that._children;
		if (check && children.length === 0)
			throw new Error('Use a moveTo() command first');
		return children[children.length - 1];
	}

	var fields = {
		// Note: Documentation for these methods is found in PathItem, as they
		// are considered abstract methods of PathItem and need to be defined in
		// all implementing classes.
		moveTo: function(/* point */) {
			var current = getCurrentPath(this),
				// Reuse current path if nothing was added yet
				path = current && current.isEmpty() ? current
						: new Path(Item.NO_INSERT);
			if (path !== current)
				this.addChild(path);
			path.moveTo.apply(path, arguments);
		},

		moveBy: function(/* point */) {
			var current = getCurrentPath(this, true),
				last = current && current.getLastSegment(),
				point = Point.read(arguments);
			this.moveTo(last ? point.add(last._point) : point);
		},

		closePath: function(join) {
			getCurrentPath(this, true).closePath(join);
		}
	};

	// Redirect all other drawing commands to the current path
	Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo', 'arcTo',
			'lineBy', 'cubicCurveBy', 'quadraticCurveBy', 'curveBy', 'arcBy'],
			function(key) {
				fields[key] = function() {
					var path = getCurrentPath(this, true);
					path[key].apply(path, arguments);
				};
			}
	);

	return fields;
});

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

/*
 * Boolean Geometric Path Operations
 *
 * Supported
 *	- Path and CompoundPath items
 *	- Boolean Union
 *	- Boolean Intersection
 *	- Boolean Subtraction
 *	- Boolean Exclusion
 *	- Resolving a self-intersecting Path items
 *	- Boolean operations on self-intersecting Paths items
 *
 * @author Harikrishnan Gopalakrishnan
 * http://hkrish.com/playground/paperjs/booleanStudy.html
 */
PathItem.inject(new function() {
	var operators = {
		unite: function(w) {
			return w === 1 || w === 0;
		},

		intersect: function(w) {
			return w === 2;
		},

		subtract: function(w) {
			return w === 1;
		},

		exclude: function(w) {
			return w === 1;
		}
	};

	/*
	 * Creates a clone of the path that we can modify freely, with its matrix
	 * applied to its geometry. Calls #reduce() to simplify compound paths and
	 * remove empty curves, #resolveCrossings() to resolve self- intersection
	 * and #reorient() to make sure all paths have correct winding direction.
	 */
	function preparePath(path, resolve) {
		var res = path.clone(false).reduce().transform(null, true, true);
		return resolve ? res.resolveCrossings().reorient() : res;
	}

	function finishBoolean(ctor, paths, path1, path2, reduce) {
		var result = new ctor(Item.NO_INSERT);
		result.addChildren(paths, true);
		// See if the item can be reduced to just a simple Path.
		if (reduce)
			result = result.reduce();
		// Insert the resulting path above whichever of the two paths appear
		// further up in the stack.
		result.insertAbove(path2 && path1.isSibling(path2)
				&& path1.getIndex() < path2.getIndex()
					? path2 : path1);
		// Copy over the left-hand item's style and we're done.
		// TODO: Consider using Item#_clone() for this, but find a way to not
		// clone children / name (content).
		result.setStyle(path1._style);
		return result;
	}

	// Boolean operators return true if a curve with the given winding
	// contribution contributes to the final result or not. They are called
	// for each curve in the graph after curves in the operands are
	// split at intersections.
	function computeBoolean(path1, path2, operation) {
		// If path1 is open, delegate to computeOpenBoolean()
		if (!path1._children && !path1._closed)
			return computeOpenBoolean(path1, path2, operation);
		// We do not modify the operands themselves, but create copies instead,
		// fas produced by the calls to preparePath().
		// Note that the result paths might not belong to the same type
		// i.e. subtraction(A:Path, B:Path):CompoundPath etc.
		var _path1 = preparePath(path1, true),
			_path2 = path2 && path1 !== path2 && preparePath(path2, true);
		// Give both paths the same orientation except for subtraction
		// and exclusion, where we need them at opposite orientation.
		if (_path2 && /^(subtract|exclude)$/.test(operation)
				^ (_path2.isClockwise() !== _path1.isClockwise()))
			_path2.reverse();
		// Split curves at crossings and overlaps on both paths. Note that for
		// self-intersection, path2 is null and getIntersections() handles it.
		var intersections = CurveLocation.expand(
			_path1.getIntersections(_path2, function(inter) {
				// Only handle overlaps when not self-intersecting
				return _path2 && inter.isOverlap() || inter.isCrossing();
			})
		);
		divideLocations(intersections);

		var segments = [],
			// Aggregate of all curves in both operands, monotonic in y
			monoCurves = [];

		function collect(paths) {
			for (var i = 0, l = paths.length; i < l; i++) {
				var path = paths[i];
				segments.push.apply(segments, path._segments);
				monoCurves.push.apply(monoCurves, path._getMonoCurves());
			}
		}

		// Collect all segments and monotonic curves
		collect(_path1._children || [_path1]);
		if (_path2)
			collect(_path2._children || [_path2]);
		// Propagate the winding contribution. Winding contribution of curves
		// does not change between two intersections.
		// First, propagate winding contributions for curve chains starting in
		// all intersections:
		for (var i = 0, l = intersections.length; i < l; i++) {
			propagateWinding(intersections[i]._segment, _path1, _path2,
					monoCurves, operation);
		}
		// Now process the segments that are not part of any intersecting chains
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			if (segment._winding == null) {
				propagateWinding(segment, _path1, _path2, monoCurves,
						operation);
			}
		}
		return finishBoolean(CompoundPath, tracePaths(segments, operation),
				path1, path2, true);
	}

	function computeOpenBoolean(path1, path2, operation) {
		// Only support subtract and intersect operations between an open
		// and a closed path. Assume that compound-paths are closed.
		// TODO: Should we complain about not supported operations?
		if (!path2 || !path2._children && !path2._closed
				|| !/^(subtract|intersect)$/.test(operation))
			return null;
		var _path1 = preparePath(path1, false),
			_path2 = preparePath(path2, false),
			intersections = _path1.getIntersections(_path2, function(inter) {
				return inter.isOverlap() || inter.isCrossing();
			}),
			sub = operation === 'subtract',
			paths = [];

		function addPath(path) {
			// Simple see if the point halfway across the open path is inside
			// path2, and include / exclude the path based on the operation.
			if (_path2.contains(path.getPointAt(path.getLength() / 2)) ^ sub) {
				paths.unshift(path);
				return true;
			}
		}

		// Now loop backwards through all intersections, split the path and
		// check the new path that was split off for inclusion.
		for (var i = intersections.length - 1; i >= 0; i--) {
			var path = intersections[i].split();
			if (path) {
				// See if we can add the path, and if so, clear the first handle
				// at the split, because it might have been a curve.
				if (addPath(path))
					path.getFirstSegment().setHandleIn(0, 0);
				// Clear the other side of the split too, which is always the
				// end of the remaining _path1.
				_path1.getLastSegment().setHandleOut(0, 0);
			}
		}
		// At the end, check what's left from our path after all the splitting.
		addPath(_path1);
		return finishBoolean(Group, paths, path1, path2);
	}

	/*
	 * Creates linked lists between intersections through their _next and _prev
	 * properties.
	 *
	 * @private
	 */
	function linkIntersections(from, to) {
		// Only create the link if it's not already in the existing chain, to
		// avoid endless recursions. First walk to the beginning of the chain,
		// and abort if we find `to`.
		var prev = from;
		while (prev) {
			if (prev === to)
				return;
			prev = prev._prev;
		}
		// Now walk to the end of the existing chain to find an empty spot, but
		// stop if we find `to`, to avoid adding it again.
		while (from._next && from._next !== to)
			from = from._next;
		// If we're reached the end of the list, we can add it.
		if (!from._next) {
			// Go back to beginning of the other chain, and link the two up.
			while (to._prev)
				to = to._prev;
			from._next = to;
			to._prev = from;
		}
	}

	/**
	 * Divides the path-items at the given locations.
	 *
	 * @param {CurveLocation[]} locations an array of the locations to split the
	 * path-item at.
	 * @private
	 */
	function divideLocations(locations) {
		var tMin = 4e-7,
			tMax = 1 - tMin,
			noHandles = false,
			clearSegments = [],
			prevCurve,
			prevT;

		for (var i = locations.length - 1; i >= 0; i--) {
			var loc = locations[i],
				curve = loc._curve,
				t = loc._parameter,
				origT = t;
			if (curve !== prevCurve) {
				// This is a new curve, update noHandles setting.
				noHandles = !curve.hasHandles();
			} else if (prevT > 0) {
				// Scale parameter when we are splitting same curve multiple
				// times, but avoid dividing by zero.
				t /= prevT;
			}
			var segment;
			if (t < tMin) {
				segment = curve._segment1;
			} else if (t > tMax) {
				segment = curve._segment2;
			} else {
				// Split the curve at t, passing true for _setHandles to always
				// set the handles on the sub-curves even if the original curve
				// had no handles.
				segment = curve.divide(t, true, true)._segment1;
				// Keep track of segments of curves without handles, so they can
				// be cleared again at the end.
				if (noHandles)
					clearSegments.push(segment);
			}
			loc._setSegment(segment);
			// Create links from the new segment to the intersection on the
			// other curve, as well as from there back. If there are multiple
			// intersections on the same segment, we create linked lists between
			// the intersections through linkIntersections(), linking both ways.
			var inter = segment._intersection,
				dest = loc._intersection;
			if (inter) {
				linkIntersections(inter, dest);
				// Each time we add a new link to the linked list, we need to
				// add links from all the other entries to the new entry.
				var other = inter;
				while (other) {
					linkIntersections(other._intersection, inter);
					other = other._next;
				}
			} else {
				segment._intersection = dest;
			}
			prevCurve = curve;
			prevT = origT;
		}
		// Clear segment handles if they were part of a curve with no handles,
		// once we are done with the entire curve.
		for (var i = 0, l = clearSegments.length; i < l; i++) {
			clearSegments[i].clearHandles();
		}
	}

	/**
	 * Private method that returns the winding contribution of the given point
	 * with respect to a given set of monotone curves.
	 */
	function getWinding(point, curves, horizontal, testContains) {
		var epsilon = 2e-7,
			tMin = 4e-7,
			tMax = 1 - tMin,
			px = point.x,
			py = point.y,
			windLeft = 0,
			windRight = 0,
			roots = [],
			abs = Math.abs;
		// Absolutely horizontal curves may return wrong results, since
		// the curves are monotonic in y direction and this is an
		// indeterminate state.
		if (horizontal) {
			var yTop = -Infinity,
				yBottom = Infinity,
				yBefore = py - epsilon,
				yAfter = py + epsilon;
			// Find the closest top and bottom intercepts for the same vertical
			// line.
			for (var i = 0, l = curves.length; i < l; i++) {
				var values = curves[i].values;
				if (Curve.solveCubic(values, 0, px, roots, 0, 1) > 0) {
					for (var j = roots.length - 1; j >= 0; j--) {
						var y = Curve.getPoint(values, roots[j]).y;
						if (y < yBefore && y > yTop) {
							yTop = y;
						} else if (y > yAfter && y < yBottom) {
							yBottom = y;
						}
					}
				}
			}
			// Shift the point lying on the horizontal curves by
			// half of closest top and bottom intercepts.
			yTop = (yTop + py) / 2;
			yBottom = (yBottom + py) / 2;
			if (yTop > -Infinity)
				windLeft = getWinding(new Point(px, yTop), curves, false,
						testContains);
			if (yBottom < Infinity)
				windRight = getWinding(new Point(px, yBottom), curves, false,
						testContains);
		} else {
			var xBefore = px - epsilon,
				xAfter = px + epsilon;
			// Find the winding number for right side of the curve, inclusive of
			// the curve itself, while tracing along its +-x direction.
			var startCounted = false,
				prevCurve,
				prevT;
			for (var i = 0, l = curves.length; i < l; i++) {
				var curve = curves[i],
					values = curve.values,
					winding = curve.winding;
				// Since the curves are monotone in y direction, we can just
				// compare the endpoints of the curve to determine if the
				// ray from query point along +-x direction will intersect
				// the monotone curve. Results in quite significant speedup.
				if (winding && (winding === 1
						&& py >= values[1] && py <= values[7]
						|| py >= values[7] && py <= values[1])
					&& Curve.solveCubic(values, 1, py, roots, 0, 1) === 1) {
					var t = roots[0];
					// Due to numerical precision issues, two consecutive curves
					// may register an intercept twice, at t = 1 and 0, if y is
					// almost equal to one of the endpoints of the curves.
					// But since curves may contain more than one loop of curves
					// and the end point on the last curve of a loop would not
					// be registered as a double, we need to filter these cases:
					if (!( // = the following conditions will be excluded:
						// Detect and exclude intercepts at 'end' of loops
						// if the start of the loop was already counted.
						// This also works for the last curve: [i + 1] == null
						t > tMax && startCounted && curve.next !== curves[i + 1]
						// Detect 2nd case of a consecutive intercept, but make
						// sure we're still on the same loop.
						|| t < tMin && prevT > tMax
							&& curve.previous === prevCurve)) {
						var x = Curve.getPoint(values, t).x,
							slope = Curve.getTangent(values, t).y,
							counted = false;
						// Take care of cases where the curve and the preceding
						// curve merely touches the ray towards +-x direction,
						// but proceeds to the same side of the ray.
						// This essentially is not a crossing.
						if (Numerical.isZero(slope) && !Curve.isStraight(values)
								// Does the slope over curve beginning change?
								|| t < tMin && slope * Curve.getTangent(
									curve.previous.values, 1).y < 0
								// Does the slope over curve end change?
								|| t > tMax && slope * Curve.getTangent(
									curve.next.values, 0).y < 0) {
							if (testContains && x >= xBefore && x <= xAfter) {
								++windLeft;
								++windRight;
								counted = true;
							}
						} else if (x <= xBefore) {
							windLeft += winding;
							counted = true;
						} else if (x >= xAfter) {
							windRight += winding;
							counted = true;
						}
						// Detect the beginning of a new loop by comparing with
						// the previous curve, and set startCounted accordingly.
						// This also works for the first loop where i - 1 == -1
						if (curve.previous !== curves[i - 1])
							startCounted = t < tMin && counted;
					}
					prevCurve = curve;
					prevT = t;
				}
			}
		}
		return Math.max(abs(windLeft), abs(windRight));
	}

	function propagateWinding(segment, path1, path2, monoCurves, operation) {
		// Here we try to determine the most probable winding number
		// contribution for the curve-chain starting with this segment. Once we
		// have enough confidence in the winding contribution, we can propagate
		// it until the next intersection or end of a curve chain.
		var epsilon = 2e-7,
			chain = [],
			start = segment,
			totalLength = 0,
			windingSum = 0;
		do {
			var curve = segment.getCurve(),
				length = curve.getLength();
			chain.push({ segment: segment, curve: curve, length: length });
			totalLength += length;
			segment = segment.getNext();
		} while (segment && !segment._intersection && segment !== start);
		// Calculate the average winding among three evenly distributed
		// points along this curve chain as a representative winding number.
		// This selection gives a better chance of returning a correct
		// winding than equally dividing the curve chain, with the same
		// (amortised) time.
		for (var i = 0; i < 3; i++) {
			// Sample the points at 1/4, 2/4 and 3/4 of the total length:
			var length = totalLength * (i + 1) / 4;
			for (var k = 0, m = chain.length; k < m; k++) {
				var node = chain[k],
					curveLength = node.length;
				if (length <= curveLength) {
					// If the selected location on the curve falls onto its
					// beginning or end, use the curve's center instead.
					if (length < epsilon || curveLength - length < epsilon)
						length = curveLength / 2;
					var curve = node.curve,
						path = curve._path,
						parent = path._parent,
						pt = curve.getPointAt(length),
						hor = curve.isHorizontal();
					if (parent instanceof CompoundPath)
						path = parent;
					// While subtracting, we need to omit this curve if this
					// curve is contributing to the second operand and is
					// outside the first operand.
					windingSum += operation === 'subtract' && path2
						&& (path === path1 && path2._getWinding(pt, hor)
						|| path === path2 && !path1._getWinding(pt, hor))
						? 0
						: getWinding(pt, monoCurves, hor);
					break;
				}
				length -= curveLength;
			}
		}
		// Assign the average winding to the entire curve chain.
		var winding = Math.round(windingSum / 3);
		for (var j = chain.length - 1; j >= 0; j--)
			chain[j].segment._winding = winding;
	}

	/**
	 * Private method to trace closed contours from a set of segments according
	 * to a set of constraints-winding contribution and a custom operator.
	 *
	 * @param {Segment[]} segments Array of 'seed' segments for tracing closed
	 * contours
	 * @param {Function} the operator function that receives as argument the
	 * winding number contribution of a curve and returns a boolean value
	 * indicating whether the curve should be  included in the final contour or
	 * not
	 * @return {Path[]} the contours traced
	 */
	function tracePaths(segments, operation) {
		var paths = [],
			start,
			otherStart,
			operator = operators[operation],
			// Adjust winding contributions for specific operations on overlaps:
			overlapWinding = {
				unite: { 1: 2 },
				intersect: { 2: 1 }
			}[operation];

		function isValid(seg, adjusted) {
			if (seg._visited)
				return false;
			if (!operator) // For self-intersection, we're always valid!
				return true;
			var winding = seg._winding,
				inter = seg._intersection;
			if (inter && adjusted && overlapWinding && inter.isOverlap())
				winding = overlapWinding[winding] || winding;
			return operator(winding);
		}

		function isStart(seg) {
			return seg === start || seg === otherStart;
		}

		// If there are multiple possible intersections, find the one
		// that's either connecting back to start or is not visited yet,
		// and will be part of the boolean result:
		function findBestIntersection(inter, strict) {
			if (!inter._next)
				return inter;
			while (inter) {
				var seg = inter._segment,
					nextSeg = seg.getNext(),
					nextInter = nextSeg._intersection;
				// See if this segment and the next are both not visited yet, or
				// are bringing us back to the beginning, and are both part of
				// the boolean result.
				// Handling overlaps correctly here is tricky, requiring two
				// passes, first with strict = true, then false:
				// In strict mode, the current and the next segment are both
				// checked for validity, and only the current one is allowed to
				// be an overlap (passing true for unadjusted in isValid()).
				// If this pass does not yield a result, the non-strict mode is
				// used, in which invalid current segments are tolerated, and
				// overlaps for the next segment are allowed as long as they are
				// valid when not adjusted.
				if (isStart(nextSeg)
					|| !seg._visited && !nextSeg._visited
					// Self-intersections (!operator) don't need isValid() calls
					&& (!operator
						// Do not use the overlap-adjusted winding here since an
						// overlap crossing might have brought us here, in which
						// case isValid(seg) might be false.
						|| (!strict || isValid(seg))
						// Do not consider nextSeg in strict mode if it is part
						// of an overlap, in order to give non-overlapping
						// options that might follow the priority over overlaps.
						&& (!(strict && nextInter && nextInter.isOverlap())
							&& isValid(nextSeg)
							// If the next segment isn't valid, its intersection
							// to which we may switch might be, so check that.
							|| !strict && nextInter
							&& isValid(nextInter._segment))
					))
					return inter;
				// If it's no match, continue with the next linked intersection.
				inter = inter._next;
			}
			return null;
		}

		function findStartSegment(inter, next) {
			while (inter) {
				var seg = inter._segment;
				if (isStart(seg))
					return seg;
				inter = inter[next ? '_next' : '_prev'];
			}
		}

		for (var i = 0, l = segments.length; i < l; i++) {
			var seg = segments[i],
				path = null,
				finished = false;
			// Do not start a chain with already visited segments, and segments
			// that are not going to be part of the resulting operation.
			if (!isValid(seg, true))
				continue;
			start = otherStart = null;
			while (!finished) {
				var inter = seg._intersection,
					handleIn = path && seg._handleIn;
				// Once we started a chain, see if there are multiple
				// intersections, and if so, pick the best one:
				inter = inter && (findBestIntersection(inter, true)
						|| findBestIntersection(inter, false)) || inter;
				// Get a reference to the other segment on the intersection.
				var other = inter && inter._segment;
				// If we are at a crossing and the other segment is part of the
				// boolean result, switch to it.
				if (other && isValid(other))
					seg = other;
				// If the new segment is visited already, check if we're back
				// at the start.
				if (seg._visited) {
					finished = isStart(seg);
					if (!finished && inter) {
						// See if any of the intersections is the start segment,
						// and if so finish the path.
						var found = findStartSegment(inter, true)
							|| findStartSegment(inter, false);
						if (found) {
							seg = found;
							finished = true;
						}
					}
					break;
				}
				if (!path) {
					path = new Path(Item.NO_INSERT);
					start = seg;
					otherStart = other;
				}
				// Add the segment to the path, and mark it as visited.
				path.add(new Segment(seg._point, handleIn, seg._handleOut));
				seg._visited = true;
				seg = seg.getNext();
				finished = isStart(seg);
			}
			// Finish with closing the paths if necessary, correctly linking up
			// curves etc.
			if (finished) {
				path.firstSegment.setHandleIn(seg._handleIn);
				path.setClosed(true);
			} else if (path) {
				// This path wasn't finished and is hence invalid.
				// Report the error to the console for the time being.
				console.error('Boolean operation resulted in open path',
						'segments =', path._segments.length,
						'length =', path.getLength());
				path = null;
			}
			// Add the path to the result, while avoiding stray segments and
			// paths that are incomplete or cover no area.
			// As an optimization, only check paths with 8 or less segments
			// for their area, and assume that they cover an area when more.
			if (path && (path._segments.length > 8
					|| !Numerical.isZero(path.getArea()))) {
				paths.push(path);
				path = null;
			}
		}
		return paths;
	}

	return /** @lends PathItem# */{
		/**
		 * Returns the winding contribution of the given point with respect to
		 * this PathItem.
		 *
		 * @param {Point} point the location for which to determine the winding
		 * direction
		 * @param {Boolean} horizontal whether we need to consider this point as
		 * part of a horizontal curve
		 * @param {Boolean} testContains whether we need to consider this point
		 * as part of stationary points on the curve itself, used when checking
		 * the winding about a point
		 * @return {Number} the winding number
		 */
		_getWinding: function(point, horizontal, testContains) {
			return getWinding(point, this._getMonoCurves(),
					horizontal, testContains);
		},

		/**
		 * {@grouptitle Boolean Path Operations}
		 *
		 * Merges the geometry of the specified path with this path's geometry
		 * and returns the result as a new path item.
		 *
		 * @param {PathItem} path the path to unite with
		 * @return {PathItem} the resulting path item
		 */
		unite: function(path) {
			return computeBoolean(this, path, 'unite');
		},

		/**
		 * Intersects the geometry of the specified path with this path's
		 * geometry and returns the result as a new path item.
		 *
		 * @param {PathItem} path the path to intersect with
		 * @return {PathItem} the resulting path item
		 */
		intersect: function(path) {
			return computeBoolean(this, path, 'intersect');
		},

		/**
		 * Subtracts the geometry of the specified path from this path's
		 * geometry and returns the result as a new path item.
		 *
		 * @param {PathItem} path the path to subtract
		 * @return {PathItem} the resulting path item
		 */
		subtract: function(path) {
			return computeBoolean(this, path, 'subtract');
		},

		/**
		 * Excludes the intersection of the geometry of the specified path with
		 * this path's geometry and returns the result as a new path item.
		 *
		 * @param {PathItem} path the path to exclude the intersection of
		 * @return {PathItem} the resulting group item
		 */
		exclude: function(path) {
			return computeBoolean(this, path, 'exclude');
		},

		/**
		 * Splits the geometry of this path along the geometry of the specified
		 * path returns the result as a new group item. This is equivalent to
		 * calling {@link #subtract(path)} and {@link #subtract(path)} and
		 * putting the results into a new group.
		 *
		 * @param {PathItem} path the path to divide by
		 * @return {Group} the resulting group item
		 */
		divide: function(path) {
			return finishBoolean(Group,
					[this.subtract(path), this.intersect(path)],
					this, path, true);
		},

		resolveCrossings: function() {
			var crossings = this.getCrossings();
			if (!crossings.length)
				return this;
			divideLocations(CurveLocation.expand(crossings));
			var paths = this._children || [this],
				segments = [];
			for (var i = 0, l = paths.length; i < l; i++) {
				segments.push.apply(segments, paths[i]._segments);
			}
			return finishBoolean(CompoundPath, tracePaths(segments),
					this, null, false);
		}
	};
});

Path.inject(/** @lends Path# */{
	/**
	 * Private method that returns and caches all the curves in this Path,
	 * which are monotonically decreasing or increasing in the y-direction.
	 * Used by getWinding().
	 */
	_getMonoCurves: function() {
		var monoCurves = this._monoCurves,
			prevCurve;

		// Insert curve values into a cached array
		function insertCurve(v) {
			var y0 = v[1],
				y1 = v[7],
				curve = {
					values: v,
					winding: y0 === y1
						? 0 // Horizontal
						: y0 > y1
							? -1 // Decreasing
							: 1, // Increasing
					// Add a reference to neighboring curves.
					previous: prevCurve,
					next: null // Always set it for hidden class optimization.
				};
			if (prevCurve)
				prevCurve.next = curve;
			monoCurves.push(curve);
			prevCurve = curve;
		}

		// Handle bezier curves. We need to chop them into smaller curves  with
		// defined orientation, by solving the derivative curve for y extrema.
		function handleCurve(v) {
			// Filter out curves of zero length.
			// TODO: Do not filter this here.
			if (Curve.getLength(v) === 0)
				return;
			var y0 = v[1],
				y1 = v[3],
				y2 = v[5],
				y3 = v[7];
			if (Curve.isStraight(v)) {
				// Handling straight curves is easy.
				insertCurve(v);
			} else {
				// Split the curve at y extrema, to get bezier curves with clear
				// orientation: Calculate the derivative and find its roots.
				var a = 3 * (y1 - y2) - y0 + y3,
					b = 2 * (y0 + y2) - 4 * y1,
					c = y1 - y0,
					tMin = 4e-7,
					tMax = 1 - tMin,
					roots = [],
					// Keep then range to 0 .. 1 (excluding) in the search for y
					// extrema.
					n = Numerical.solveQuadratic(a, b, c, roots, tMin, tMax);
				if (n === 0) {
					insertCurve(v);
				} else {
					roots.sort();
					var t = roots[0],
						parts = Curve.subdivide(v, t);
					insertCurve(parts[0]);
					if (n > 1) {
						// If there are two extrema, renormalize t to the range
						// of the second range and split again.
						t = (roots[1] - t) / (1 - t);
						// Since we already processed parts[0], we can override
						// the parts array with the new pair now.
						parts = Curve.subdivide(parts[1], t);
						insertCurve(parts[0]);
					}
					insertCurve(parts[1]);
				}
			}
		}

		if (!monoCurves) {
			// Insert curves that are monotonic in y direction into cached array
			monoCurves = this._monoCurves = [];
			var curves = this.getCurves(),
				segments = this._segments;
			for (var i = 0, l = curves.length; i < l; i++)
				handleCurve(curves[i].getValues());
			// If the path is not closed, we need to join the end points with a
			// straight line, just like how filling open paths works.
			if (!this._closed && segments.length > 1) {
				var p1 = segments[segments.length - 1]._point,
					p2 = segments[0]._point,
					p1x = p1._x, p1y = p1._y,
					p2x = p2._x, p2y = p2._y;
				handleCurve([p1x, p1y, p1x, p1y, p2x, p2y, p2x, p2y]);
			}
			if (monoCurves.length > 0) {
				// Link first and last curves
				var first = monoCurves[0],
					last = monoCurves[monoCurves.length - 1];
				first.previous = last;
				last.next = first;
			}
		}
		return monoCurves;
	},

	/**
	 * Returns a point that is guaranteed to be inside the path.
	 *
	 * @type Point
	 * @bean
	 */
	getInteriorPoint: function() {
		var bounds = this.getBounds(),
			point = bounds.getCenter(true);
		if (!this.contains(point)) {
			// Since there is no guarantee that a poly-bezier path contains
			// the center of its bounding rectangle, we shoot a ray in
			// +x direction from the center and select a point between
			// consecutive intersections of the ray
			var curves = this._getMonoCurves(),
				roots = [],
				y = point.y,
				xIntercepts = [];
			for (var i = 0, l = curves.length; i < l; i++) {
				var values = curves[i].values;
				if ((curves[i].winding === 1
						&& y >= values[1] && y <= values[7]
						|| y >= values[7] && y <= values[1])
						&& Curve.solveCubic(values, 1, y, roots, 0, 1) > 0) {
					for (var j = roots.length - 1; j >= 0; j--)
						xIntercepts.push(Curve.getPoint(values, roots[j]).x);
				}
				if (xIntercepts.length > 1)
					break;
			}
			point.x = (xIntercepts[0] + xIntercepts[1]) / 2;
		}
		return point;
	},

	reorient: function() {
		// Paths that are not part of compound paths should never be counter-
		// clockwise for boolean operations.
		this.setClockwise(true);
		return this;
	}
});

CompoundPath.inject(/** @lends CompoundPath# */{
	/**
	 * Private method that returns all the curves in this CompoundPath, which
	 * are monotonically decreasing or increasing in the 'y' direction.
	 * Used by getWinding().
	 */
	_getMonoCurves: function() {
		var children = this._children,
			monoCurves = [];
		for (var i = 0, l = children.length; i < l; i++)
			monoCurves.push.apply(monoCurves, children[i]._getMonoCurves());
		return monoCurves;
	},

	/*
	 * Fixes the orientation of a CompoundPath's child paths by first ordering
	 * them according to their area, and then making sure that all children are
	 * of different winding direction than the first child, except for when
	 * some individual contours are disjoint, i.e. islands, they are reoriented
	 * so that:
	 * - The holes have opposite winding direction.
	 * - Islands have to have the same winding direction as the first child.
	 */
	// NOTE: Does NOT handle self-intersecting CompoundPaths on itself, but
	// the boolean code above resolves these before calling reorient().
	reorient: function() {
		var children = this.removeChildren().sort(function(a, b) {
			return b.getBounds().getArea() - a.getBounds().getArea();
		});
		if (children.length > 0) {
			this.addChildren(children);
			var clockwise = children[0].isClockwise();
			// Skip the first child
			for (var i = 1, l = children.length; i < l; i++) {
				var point = children[i].getInteriorPoint(),
					counters = 0;
				for (var j = i - 1; j >= 0; j--) {
					if (children[j].contains(point))
						counters++;
				}
				children[i].setClockwise(counters % 2 === 0 && clockwise);
			}
		}
		return this;
	}
});

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
 * @name PathIterator
 * @class
 * @private
 */
var PathIterator = Base.extend({
	_class: 'PathIterator',

	/**
	 * Creates a path iterator for the given path.
	 *
	 * @param {Path} path the path to iterate over
	 * @param {Number} [maxRecursion=32] the maximum amount of recursion in
	 * curve subdivision when mapping offsets to curve parameters
	 * @param {Number} [tolerance=0.25] the error tolerance at which the
	 * recursion is interrupted before the maximum number of iterations is
	 * reached
	 * @param {Matrix} [matrix] the matrix by which to transform the path's
	 * coordinates without modifying the actual path.
	 * @return {PathIterator} the newly created path iterator
	 */
	initialize: function(path, maxRecursion, tolerance, matrix) {
		// Instead of relying on path.curves, we only use segments here and
		// get the curve values from them.
		var curves = [], // The curve values as returned by getValues()
			parts = [], // The calculated, subdivided parts of the path
			length = 0, // The total length of the path
			// By default, we're not subdividing more than 32 times.
			minDifference = 1 / (maxRecursion || 32),
			segments = path._segments,
			segment1 = segments[0],
			segment2;

		// Iterate through all curves and compute the parts for each of them,
		// by recursively calling computeParts().
		function addCurve(segment1, segment2) {
			var curve = Curve.getValues(segment1, segment2, matrix);
			curves.push(curve);
			computeParts(curve, segment1._index, 0, 1);
		}

		function computeParts(curve, index, minT, maxT) {
			// Check if the t-span is big enough for subdivision.
			if ((maxT - minT) > minDifference
					// After quite a bit of testing, a default tolerance of 0.25
					// appears to offer a good trade-off between speed and
					// precision for display purposes.
					&& !Curve.isFlatEnough(curve, tolerance || 0.25)) {
				var split = Curve.subdivide(curve, 0.5),
					halfT = (minT + maxT) / 2;
				// Recursively subdivide and compute parts again.
				computeParts(split[0], index, minT, halfT);
				computeParts(split[1], index, halfT, maxT);
			} else {
				// Calculate distance between p1 and p2
				var x = curve[6] - curve[0],
					y = curve[7] - curve[1],
					dist = Math.sqrt(x * x + y * y);
				if (dist > 1e-6) {
					length += dist;
					parts.push({
						offset: length,
						value: maxT,
						index: index
					});
				}
			}
		}

		for (var i = 1, l = segments.length; i < l; i++) {
			segment2 = segments[i];
			addCurve(segment1, segment2);
			segment1 = segment2;
		}
		if (path._closed)
			addCurve(segment2, segments[0]);

		this.curves = curves;
		this.parts = parts;
		this.length = length;
		// Keep a current index from the part where we last where in
		// getParameterAt(), to optimise for iterator-like usage of iterator.
		this.index = 0;
	},

	getParameterAt: function(offset) {
		// Make sure we're not beyond the requested offset already. Search the
		// start position backwards from where to then process the loop below.
		var i, j = this.index;
		for (;;) {
			i = j;
			if (j == 0 || this.parts[--j].offset < offset)
				break;
		}
		// Find the part that succeeds the given offset, then interpolate
		// with the previous part
		for (var l = this.parts.length; i < l; i++) {
			var part = this.parts[i];
			if (part.offset >= offset) {
				// Found the right part, remember current position
				this.index = i;
				// Now get the previous part so we can linearly interpolate
				// the curve parameter
				var prev = this.parts[i - 1];
				// Make sure we only use the previous parameter value if its
				// for the same curve, by checking index. Use 0 otherwise.
				var prevVal = prev && prev.index == part.index ? prev.value : 0,
					prevLen = prev ? prev.offset : 0;
				return {
					// Interpolate
					value: prevVal + (part.value - prevVal)
						* (offset - prevLen) / (part.offset - prevLen),
					index: part.index
				};
			}
		}
		// Return last one
		var part = this.parts[this.parts.length - 1];
		return {
			value: 1,
			index: part.index
		};
	},

	drawPart: function(ctx, from, to) {
		from = this.getParameterAt(from);
		to = this.getParameterAt(to);
		for (var i = from.index; i <= to.index; i++) {
			var curve = Curve.getPart(this.curves[i],
					i == from.index ? from.value : 0,
					i == to.index ? to.value : 1);
			if (i == from.index)
				ctx.moveTo(curve[0], curve[1]);
			ctx.bezierCurveTo.apply(ctx, curve.slice(2));
		}
	}
}, Base.each(Curve.evaluateMethods,
	function(name) {
		this[name + 'At'] = function(offset, weighted) {
			var param = this.getParameterAt(offset);
			return Curve[name](this.curves[param.index], param.value, weighted);
		};
	}, {})
);


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

// An Algorithm for Automatically Fitting Digitized Curves
// by Philip J. Schneider
// from "Graphics Gems", Academic Press, 1990
// Modifications and optimisations of original algorithm by Juerg Lehni.

/**
 * @name PathFitter
 * @class
 * @private
 */
var PathFitter = Base.extend({
	initialize: function(path, error) {
		var points = this.points = [],
			segments = path._segments,
			prev;
		// Copy over points from path and filter out adjacent duplicates.
		for (var i = 0, l = segments.length; i < l; i++) {
			var point = segments[i].point.clone();
			if (!prev || !prev.equals(point)) {
				points.push(point);
				prev = point;
			}
		}

		// We need to duplicate the first and last segment when simplifying a
		// closed path.
		if (path._closed) {
			this.closed = true;
			points.unshift(points[points.length - 1]);
			points.push(points[1]); // The point previously at index 0 is now 1.
		}

		this.error = error;
	},

	fit: function() {
		var points = this.points,
			length = points.length,
			segments = this.segments = length > 0
					? [new Segment(points[0])] : [];
		if (length > 1)
			this.fitCubic(0, length - 1,
				// Left Tangent
				points[1].subtract(points[0]).normalize(),
				// Right Tangent
				points[length - 2].subtract(points[length - 1]).normalize());

		// Remove the duplicated segments for closed paths again.
		if (this.closed) {
			segments.shift();
			segments.pop();
		}

		return segments;
	},

	// Fit a Bezier curve to a (sub)set of digitized points
	fitCubic: function(first, last, tan1, tan2) {
		//	Use heuristic if region only has two points in it
		if (last - first == 1) {
			var pt1 = this.points[first],
				pt2 = this.points[last],
				dist = pt1.getDistance(pt2) / 3;
			this.addCurve([pt1, pt1.add(tan1.normalize(dist)),
					pt2.add(tan2.normalize(dist)), pt2]);
			return;
		}
		// Parameterize points, and attempt to fit curve
		var uPrime = this.chordLengthParameterize(first, last),
			maxError = Math.max(this.error, this.error * this.error),
			split,
			parametersInOrder = true;
		// Try 4 iterations
		for (var i = 0; i <= 4; i++) {
			var curve = this.generateBezier(first, last, uPrime, tan1, tan2);
			//	Find max deviation of points to fitted curve
			var max = this.findMaxError(first, last, curve, uPrime);
			if (max.error < this.error && parametersInOrder) {
				this.addCurve(curve);
				return;
			}
			split = max.index;
			// If error not too large, try reparameterization and iteration
			if (max.error >= maxError)
				break;
			parametersInOrder = this.reparameterize(first, last, uPrime, curve);
			maxError = max.error;
		}
		// Fitting failed -- split at max error point and fit recursively
		var V1 = this.points[split - 1].subtract(this.points[split]),
			V2 = this.points[split].subtract(this.points[split + 1]),
			tanCenter = V1.add(V2).divide(2).normalize();
		this.fitCubic(first, split, tan1, tanCenter);
		this.fitCubic(split, last, tanCenter.negate(), tan2);
	},

	addCurve: function(curve) {
		var prev = this.segments[this.segments.length - 1];
		prev.setHandleOut(curve[1].subtract(curve[0]));
		this.segments.push(
				new Segment(curve[3], curve[2].subtract(curve[3])));
	},

	// Use least-squares method to find Bezier control points for region.
	generateBezier: function(first, last, uPrime, tan1, tan2) {
		var epsilon = 1e-12,
			pt1 = this.points[first],
			pt2 = this.points[last],
			// Create the C and X matrices
			C = [[0, 0], [0, 0]],
			X = [0, 0];

		for (var i = 0, l = last - first + 1; i < l; i++) {
			var u = uPrime[i],
				t = 1 - u,
				b = 3 * u * t,
				b0 = t * t * t,
				b1 = b * t,
				b2 = b * u,
				b3 = u * u * u,
				a1 = tan1.normalize(b1),
				a2 = tan2.normalize(b2),
				tmp = this.points[first + i]
					.subtract(pt1.multiply(b0 + b1))
					.subtract(pt2.multiply(b2 + b3));
			C[0][0] += a1.dot(a1);
			C[0][1] += a1.dot(a2);
			// C[1][0] += a1.dot(a2);
			C[1][0] = C[0][1];
			C[1][1] += a2.dot(a2);
			X[0] += a1.dot(tmp);
			X[1] += a2.dot(tmp);
		}

		// Compute the determinants of C and X
		var detC0C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1],
			alpha1, alpha2;
		if (Math.abs(detC0C1) > epsilon) {
			// Kramer's rule
			var detC0X	= C[0][0] * X[1]	- C[1][0] * X[0],
				detXC1	= X[0]	  * C[1][1] - X[1]	  * C[0][1];
			// Derive alpha values
			alpha1 = detXC1 / detC0C1;
			alpha2 = detC0X / detC0C1;
		} else {
			// Matrix is under-determined, try assuming alpha1 == alpha2
			var c0 = C[0][0] + C[0][1],
				c1 = C[1][0] + C[1][1];
			if (Math.abs(c0) > epsilon) {
				alpha1 = alpha2 = X[0] / c0;
			} else if (Math.abs(c1) > epsilon) {
				alpha1 = alpha2 = X[1] / c1;
			} else {
				// Handle below
				alpha1 = alpha2 = 0;
			}
		}

		// If alpha negative, use the Wu/Barsky heuristic (see text)
		// (if alpha is 0, you get coincident control points that lead to
		// divide by zero in any subsequent NewtonRaphsonRootFind() call.
		var segLength = pt2.getDistance(pt1),
			eps = epsilon * segLength,
			handle1,
			handle2;
		if (alpha1 < eps || alpha2 < eps) {
			// fall back on standard (probably inaccurate) formula,
			// and subdivide further if needed.
			alpha1 = alpha2 = segLength / 3;
		} else {
			// Check if the found control points are in the right order when
			// projected onto the line through pt1 and pt2.
			var line = pt2.subtract(pt1);
			// Control points 1 and 2 are positioned an alpha distance out
			// on the tangent vectors, left and right, respectively
			handle1 = tan1.normalize(alpha1);
			handle2 = tan2.normalize(alpha2);
			if (handle1.dot(line) - handle2.dot(line) > segLength * segLength) {
				// Fall back to the Wu/Barsky heuristic above.
				alpha1 = alpha2 = segLength / 3;
				handle1 = handle2 = null; // Force recalculation
			}
		}

		// First and last control points of the Bezier curve are
		// positioned exactly at the first and last data points
		return [pt1, pt1.add(handle1 || tan1.normalize(alpha1)),
				pt2.add(handle2 || tan2.normalize(alpha2)), pt2];
	},

	// Given set of points and their parameterization, try to find
	// a better parameterization.
	reparameterize: function(first, last, u, curve) {
		for (var i = first; i <= last; i++) {
			u[i - first] = this.findRoot(curve, this.points[i], u[i - first]);
		}
		// Detect if the new parameterization has reordered the points.
		// In that case, we would fit the points of the path in the wrong order.
		for (var i = 1, l = u.length; i < l; i++) {
			if (u[i] <= u[i - 1])
				return false;
		}
		return true;
	},

	// Use Newton-Raphson iteration to find better root.
	findRoot: function(curve, point, u) {
		var curve1 = [],
			curve2 = [];
		// Generate control vertices for Q'
		for (var i = 0; i <= 2; i++) {
			curve1[i] = curve[i + 1].subtract(curve[i]).multiply(3);
		}
		// Generate control vertices for Q''
		for (var i = 0; i <= 1; i++) {
			curve2[i] = curve1[i + 1].subtract(curve1[i]).multiply(2);
		}
		// Compute Q(u), Q'(u) and Q''(u)
		var pt = this.evaluate(3, curve, u),
			pt1 = this.evaluate(2, curve1, u),
			pt2 = this.evaluate(1, curve2, u),
			diff = pt.subtract(point),
			df = pt1.dot(pt1) + diff.dot(pt2);
		// Compute f(u) / f'(u)
		if (Math.abs(df) < 1e-6)
			return u;
		// u = u - f(u) / f'(u)
		return u - diff.dot(pt1) / df;
	},

	// Evaluate a bezier curve at a particular parameter value
	evaluate: function(degree, curve, t) {
		// Copy array
		var tmp = curve.slice();
		// Triangle computation
		for (var i = 1; i <= degree; i++) {
			for (var j = 0; j <= degree - i; j++) {
				tmp[j] = tmp[j].multiply(1 - t).add(tmp[j + 1].multiply(t));
			}
		}
		return tmp[0];
	},

	// Assign parameter values to digitized points
	// using relative distances between points.
	chordLengthParameterize: function(first, last) {
		var u = [0];
		for (var i = first + 1; i <= last; i++) {
			u[i - first] = u[i - first - 1]
					+ this.points[i].getDistance(this.points[i - 1]);
		}
		for (var i = 1, m = last - first; i <= m; i++) {
			u[i] /= u[m];
		}
		return u;
	},

	// Find the maximum squared distance of digitized points to fitted curve.
	findMaxError: function(first, last, curve, u) {
		var index = Math.floor((last - first + 1) / 2),
			maxDist = 0;
		for (var i = first + 1; i < last; i++) {
			var P = this.evaluate(3, curve, u[i - first]);
			var v = P.subtract(this.points[i]);
			var dist = v.x * v.x + v.y * v.y; // squared
			if (dist >= maxDist) {
				maxDist = dist;
				index = i;
			}
		}
		return {
			error: maxDist,
			index: index
		};
	}
});


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
 * @name TextItem
 *
 * @class The TextItem type allows you to create typography. Its
 * functionality is inherited by different text item types such as
 * {@link PointText}, and {@link AreaText} (coming soon). They each add a
 * layer of functionality that is unique to their type, but share the
 * underlying properties and functions that they inherit from TextItem.
 *
 * @extends Item
 */
var TextItem = Item.extend(/** @lends TextItem# */{
	_class: 'TextItem',
	_boundsSelected: true,
	_applyMatrix: false,
	_canApplyMatrix: false,
	_serializeFields: {
		content: null
	},
	// TextItem doesn't make the distinction between the different bounds,
	// so use the same name for all of them
	_boundsGetter: 'getBounds',

	initialize: function TextItem(arg) {
		this._content = '';
		this._lines = [];
		// Support two forms of item initialization: Passing one object literal
		// describing all the different properties to be set, or a point where
		// it should be placed (arg).
		// See if a point is passed, and if so, pass it on to _initialize().
		// If not, it might be a properties object literal.
		var hasProps = arg && Base.isPlainObject(arg)
				&& arg.x === undefined && arg.y === undefined;
		this._initialize(hasProps && arg, !hasProps && Point.read(arguments));
	},

	_equals: function(item) {
		return this._content === item._content;
	},

	_clone: function _clone(copy, insert, includeMatrix) {
		copy.setContent(this._content);
		return _clone.base.call(this, copy, insert, includeMatrix);
	},

	/**
	 * The text contents of the text item.
	 *
	 * @type String
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Setting the content of a PointText item:
	 *
	 * // Create a point-text item at {x: 30, y: 30}:
	 * var text = new PointText(new Point(30, 30));
	 * text.fillColor = 'black';
	 *
	 * // Set the content of the text item:
	 * text.content = 'Hello world';
	 *
	 * @example {@paperscript}
	 * // Interactive example, move your mouse over the view below:
	 *
	 * // Create a point-text item at {x: 30, y: 30}:
	 * var text = new PointText(new Point(30, 30));
	 * text.fillColor = 'black';
	 *
	 * text.content = 'Move your mouse over the view, to see its position';
	 *
	 * function onMouseMove(event) {
	 *	   // Each time the mouse is moved, set the content of
	 *	   // the point text to describe the position of the mouse:
	 *	   text.content = 'Your position is: ' + event.point.toString();
	 * }
	 */
	getContent: function() {
		return this._content;
	},

	setContent: function(content) {
		this._content = '' + content;
		this._lines = this._content.split(/\r\n|\n|\r/mg);
		this._changed(265);
	},

	isEmpty: function() {
		return !this._content;
	},

	/**
	 * {@grouptitle Character Style}
	 *
	 * The font-family to be used in text content.
	 *
	 * @name TextItem#fontFamily
	 * @default 'sans-serif'
	 * @type String
	 */

	/**
	 *
	 * The font-weight to be used in text content.
	 *
	 * @name TextItem#fontWeight
	 * @default 'normal'
	 * @type String|Number
	 */

	/**
	 * The font size of text content, as a number in pixels, or as a string
	 * with optional units {@code 'px'}, {@code 'pt'} and {@code 'em'}.
	 *
	 * @name TextItem#fontSize
	 * @default 10
	 * @type Number|String
	 */

	/**
	 *
	 * The font-family to be used in text content, as one string.
	 * @deprecated use {@link #fontFamily} instead.
	 *
	 * @name TextItem#font
	 * @default 'sans-serif'
	 * @type String
	 */

	/**
	 * The text leading of text content.
	 *
	 * @name TextItem#leading
	 * @default fontSize * 1.2
	 * @type Number|String
	 */

	/**
	 * {@grouptitle Paragraph Style}
	 *
	 * The justification of text paragraphs.
	 *
	 * @name TextItem#justification
	 * @default 'left'
	 * @type String('left', 'right', 'center')
	 */

	/**
	 * @private
	 * @bean
	 * @deprecated use {@link #style} instead.
	 */
	getCharacterStyle: '#getStyle',
	setCharacterStyle: '#setStyle',

	/**
	 * @private
	 * @bean
	 * @deprecated use {@link #style} instead.
	 */
	getParagraphStyle: '#getStyle',
	setParagraphStyle: '#setStyle'
});

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
 * @name PointText
 *
 * @class A PointText item represents a piece of typography in your Paper.js
 * project which starts from a certain point and extends by the amount of
 * characters contained in it.
 *
 * @extends TextItem
 */
var PointText = TextItem.extend(/** @lends PointText# */{
	_class: 'PointText',

	/**
	 * Creates a point text item
	 *
	 * @name PointText#initialize
	 * @param {Point} point the position where the text will start
	 * @return {PointText} the newly created point text
	 *
	 * @example {@paperscript}
	 * var text = new PointText(new Point(200, 50));
	 * text.justification = 'center';
	 * text.fillColor = 'black';
	 * text.content = 'The contents of the point text';
	 */
	/**
	 * Creates a point text item from the properties described by an object
	 * literal.
	 *
	 * @name PointText#initialize
	 * @param {Object} object an object literal containing properties
	 * describing the path's attributes
	 * @return {PointText} the newly created point text
	 *
	 * @example {@paperscript}
	 * var text = new PointText({
	 *	   point: [50, 50],
	 *	   content: 'The contents of the point text',
	 *	   fillColor: 'black',
	 *	   fontFamily: 'Courier New',
	 *	   fontWeight: 'bold',
	 *	   fontSize: 25
	 * });
	 */
	initialize: function PointText() {
		TextItem.apply(this, arguments);
	},

	clone: function(insert) {
		return this._clone(new PointText(Item.NO_INSERT), insert);
	},

	/**
	 * The PointText's anchor point
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		// Se Item#getPosition for an explanation why we create new LinkedPoint
		// objects each time.
		var point = this._matrix.getTranslation();
		return new LinkedPoint(point.x, point.y, this, 'setPoint');
	},

	setPoint: function(/* point */) {
		var point = Point.read(arguments);
		this.translate(point.subtract(this._matrix.getTranslation()));
	},

	_draw: function(ctx) {
		if (!this._content)
			return;
		this._setStyles(ctx);
		var style = this._style,
			lines = this._lines,
			leading = style.getLeading(),
			shadowColor = ctx.shadowColor;
		ctx.font = style.getFontStyle();
		ctx.textAlign = style.getJustification();
		for (var i = 0, l = lines.length; i < l; i++) {
			// See Path._draw() for explanation about ctx.shadowColor
			ctx.shadowColor = shadowColor;
			var line = lines[i];
			if (style.hasFill()) {
				ctx.fillText(line, 0, 0);
				ctx.shadowColor = 'rgba(0,0,0,0)';
			}
			if (style.hasStroke())
				ctx.strokeText(line, 0, 0);
			ctx.translate(0, leading);
		}
	},

	_getBounds: function(getter, matrix) {
		var style = this._style,
			lines = this._lines,
			numLines = lines.length,
			justification = style.getJustification(),
			leading = style.getLeading(),
			width = this.getView().getTextWidth(style.getFontStyle(), lines),
			x = 0;
		// Adjust for different justifications.
		if (justification !== 'left')
			x -= width / (justification === 'center' ? 2: 1);
		// Until we don't have baseline measuring, assume 1 / 4 leading as a
		// rough guess:
		var bounds = new Rectangle(x,
					numLines ? - 0.75 * leading : 0,
					width, numLines * leading);
		return matrix ? matrix._transformBounds(bounds, bounds) : bounds;
	}
});


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
 * @name Color
 *
 * @class All properties and functions that expect color values in the form
 * of instances of Color objects, also accept named colors and hex values as
 * strings which are then converted to instances of
 * {@link Color} internally.
 *
 * @classexample {@paperscript}
 * // Named color values:
 *
 * // Create a circle shaped path at {x: 80, y: 50}
 * // with a radius of 30.
 * var circle = new Path.Circle(new Point(80, 50), 30);
 *
 * // Pass a color name to the fillColor property, which is internally
 * // converted to a Color.
 * circle.fillColor = 'green';
 *
 * @classexample {@paperscript}
 * // Hex color values:
 *
 * // Create a circle shaped path at {x: 80, y: 50}
 * // with a radius of 30.
 * var circle = new Path.Circle(new Point(80, 50), 30);
 *
 * // Pass a hex string to the fillColor property, which is internally
 * // converted to a Color.
 * circle.fillColor = '#ff0000';
 */
var Color = Base.extend(new function() {
	// Link color types to component indices and types:
	var types = {
		gray: ['gray'],
		rgb: ['red', 'green', 'blue'],
		hsb: ['hue', 'saturation', 'brightness'],
		hsl: ['hue', 'saturation', 'lightness'],
		gradient: ['gradient', 'origin', 'destination', 'highlight']
	};

	// Parsers of values for setters, by type and property
	var componentParsers = {},
		// Cache and canvas context for color name lookup
		colorCache = {},
		colorCtx;

	// TODO: Implement hsv, etc. CSS parsing!
	function fromCSS(string) {
		var match = string.match(/^#(\w{1,2})(\w{1,2})(\w{1,2})$/),
			components;
		if (match) {
			// Hex
			components = [0, 0, 0];
			for (var i = 0; i < 3; i++) {
				var value = match[i + 1];
				components[i] = parseInt(value.length == 1
						? value + value : value, 16) / 255;
			}
		} else if (match = string.match(/^rgba?\((.*)\)$/)) {
			// RGB / RGBA
			components = match[1].split(',');
			for (var i = 0, l = components.length; i < l; i++) {
				var value = +components[i];
				components[i] = i < 3 ? value / 255 : value;
			}
		} else {
			// Named
			var cached = colorCache[string];
			if (!cached) {
				// Use a canvas to draw to with the given name and then retrieve
				// RGB values from. Build a cache for all the used colors.
				if (!colorCtx) {
					colorCtx = CanvasProvider.getContext(1, 1);
					colorCtx.globalCompositeOperation = 'copy';
				}
				// Set the current fillStyle to transparent, so that it will be
				// transparent instead of the previously set color in case the
				// new color can not be interpreted.
				colorCtx.fillStyle = 'rgba(0,0,0,0)';
				// Set the fillStyle of the context to the passed name and fill
				// the canvas with it, then retrieve the data for the drawn
				// pixel:
				colorCtx.fillStyle = string;
				colorCtx.fillRect(0, 0, 1, 1);
				var data = colorCtx.getImageData(0, 0, 1, 1).data;
				cached = colorCache[string] = [
					data[0] / 255,
					data[1] / 255,
					data[2] / 255
				];
			}
			components = cached.slice();
		}
		return components;
	}

	// For hsb-rgb conversion, used to lookup the right parameters in the
	// values array.
	var hsbIndices = [
		[0, 3, 1], // 0
		[2, 0, 1], // 1
		[1, 0, 3], // 2
		[1, 2, 0], // 3
		[3, 1, 0], // 4
		[0, 1, 2]  // 5
	];

	// Calling convention for converters:
	// The components are passed as an arguments list, and returned as an array.
	// alpha is left out, because the conversion does not change it.
	var converters = {
		'rgb-hsb': function(r, g, b) {
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				h = delta === 0 ? 0
					:	( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:			 (r - g) / delta + 4) * 60; // max == b
			return [h, max === 0 ? 0 : delta / max, max];
		},

		'hsb-rgb': function(h, s, b) {
			// Scale h to 0..6 with modulo for negative values too
			h = (((h / 60) % 6) + 6) % 6;
			var i = Math.floor(h), // 0..5
				f = h - i,
				i = hsbIndices[i],
				v = [
					b,						// b, index 0
					b * (1 - s),			// p, index 1
					b * (1 - s * f),		// q, index 2
					b * (1 - s * (1 - f))	// t, index 3
				];
			return [v[i[0]], v[i[1]], v[i[2]]];
		},

		// HSL code is based on:
		// http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
		'rgb-hsl': function(r, g, b) {
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				achromatic = delta === 0,
				h = achromatic ? 0
					:	( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:			 (r - g) / delta + 4) * 60, // max == b
				l = (max + min) / 2,
				s = achromatic ? 0 : l < 0.5
						? delta / (max + min)
						: delta / (2 - max - min);
			return [h, s, l];
		},

		'hsl-rgb': function(h, s, l) {
			// Scale h to 0..1 with modulo for negative values too
			h = (((h / 360) % 1) + 1) % 1;
			if (s === 0)
				return [l, l, l];
			var t3s = [ h + 1 / 3, h, h - 1 / 3 ],
				t2 = l < 0.5 ? l * (1 + s) : l + s - l * s,
				t1 = 2 * l - t2,
				c = [];
			for (var i = 0; i < 3; i++) {
				var t3 = t3s[i];
				if (t3 < 0) t3 += 1;
				if (t3 > 1) t3 -= 1;
				c[i] = 6 * t3 < 1
					? t1 + (t2 - t1) * 6 * t3
					: 2 * t3 < 1
						? t2
						: 3 * t3 < 2
							? t1 + (t2 - t1) * ((2 / 3) - t3) * 6
							: t1;
			}
			return c;
		},

		'rgb-gray': function(r, g, b) {
			// Using the standard NTSC conversion formula that is used for
			// calculating the effective luminance of an RGB color:
			// http://www.mathworks.com/support/solutions/en/data/1-1ASCU/index.html?solution=1-1ASCU
			return [r * 0.2989 + g * 0.587 + b * 0.114];
		},

		'gray-rgb': function(g) {
			return [g, g, g];
		},

		'gray-hsb': function(g) {
			return [0, 0, g];
		},

		'gray-hsl': function(g) {
			// TODO: Is lightness really the same as brightness for gray?
			return [0, 0, g];
		},

		'gradient-rgb': function(/* gradient */) {
			// TODO: Implement
			return [];
		},

		'rgb-gradient': function(/* r, g, b */) {
			// TODO: Implement
			return [];
		}

	};

	// Produce getters and setter methods for the various color components known
	// by the different color types. Requesting any of these components on any
	// color internally converts the color to the required type and then returns
	// its component.
	return Base.each(types, function(properties, type) {
		// Keep track of parser functions per type.
		componentParsers[type] = [];
		Base.each(properties, function(name, index) {
			var part = Base.capitalize(name),
				// Both hue and saturation have overlapping properties between
				// hsb and hsl. Handle this here separately, by testing for
				// overlaps and skipping conversion if the type is /hs[bl]/
				hasOverlap = /^(hue|saturation)$/.test(name),
				// Produce value parser function for the given type / propeprty
				// name combination.
				parser = componentParsers[type][index] = name === 'gradient'
					? function(value) {
						var current = this._components[0];
						value = Gradient.read(Array.isArray(value) ? value
								: arguments, 0, { readNull: true });
						if (current !== value) {
							if (current)
								current._removeOwner(this);
							if (value)
								value._addOwner(this);
						}
						return value;
					}
					: type === 'gradient'
						? function(/* value */) {
							return Point.read(arguments, 0, {
									readNull: name === 'highlight',
									clone: true
							});
						}
						: function(value) {
							// NOTE: We don't clamp values here, they're only
							// clamped once the actual CSS values are produced.
							// Gotta love the fact that isNaN(null) is false,
							// while isNaN(undefined) is true.
							return value == null || isNaN(value) ? 0 : value;
						};

			this['get' + part] = function() {
				return this._type === type
					|| hasOverlap && /^hs[bl]$/.test(this._type)
						? this._components[index]
						: this._convert(type)[index];
			};

			this['set' + part] = function(value) {
				// Convert to the requrested type before setting the value
				if (this._type !== type
						&& !(hasOverlap && /^hs[bl]$/.test(this._type))) {
					this._components = this._convert(type);
					this._properties = types[type];
					this._type = type;
				}
				this._components[index] = parser.call(this, value);
				this._changed();
			};
		}, this);
	}, /** @lends Color# */{
		_class: 'Color',
		// Tell Base.read that the Point constructor supports reading with index
		_readIndex: true,

		/**
		 * Creates a RGB Color object.
		 *
		 * @name Color#initialize
		 * @param {Number} red the amount of red in the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} green the amount of green in the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} blue the amount of blue in the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} [alpha] the alpha of the color as a value between
		 * {@code 0} and {@code 1}
		 *
		 * @example {@paperscript}
		 * // Creating a RGB Color:
		 *
		 * // Create a circle shaped path at {x: 80, y: 50}
		 * // with a radius of 30:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // 100% red, 0% blue, 50% blue:
		 * circle.fillColor = new Color(1, 0, 0.5);
		 */
		/**
		 * Creates a gray Color object.
		 *
		 * @name Color#initialize
		 * @param {Number} gray the amount of gray in the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} [alpha] the alpha of the color as a value between
		 * {@code 0} and {@code 1}
		 *
		 * @example {@paperscript}
		 * // Creating a gray Color:
		 *
		 * // Create a circle shaped path at {x: 80, y: 50}
		 * // with a radius of 30:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // Create a GrayColor with 50% gray:
		 * circle.fillColor = new Color(0.5);
		 */
		/**
		 * Creates a HSB, HSL or gradient Color object from the properties of
		 * the provided object:
		 *
		 * <b>HSB Color</b>:<br>
		 * {@code hue: Number} — the hue of the color as a value in
		 * degrees between {@code 0} and {@code 360}<br>
		 * {@code saturation: Number} — the saturation of the color as a
		 * value between {@code 0} and {@code 1}<br>
		 * {@code brightness: Number} — the brightness of the color as a
		 * value between {@code 0} and {@code 1}<br>
		 * {@code alpha: Number} — the alpha of the color as a value between
		 * {@code 0} and {@code 1}
		 *
		 * <b>HSL Color</b>:<br>
		 * {@code hue: Number} — the hue of the color as a value in
		 * degrees between {@code 0} and {@code 360}<br>
		 * {@code saturation: Number} — the saturation of the color as a
		 * value between {@code 0} and {@code 1}<br>
		 * {@code lightness: Number} — the lightness of the color as a
		 * value between {@code 0} and {@code 1}<br>
		 * {@code alpha: Number} — the alpha of the color as a value between
		 * {@code 0} and {@code 1}
		 *
		 * <b>Gradient Color</b>:<br>
		 * {@code gradient: Gradient} — the gradient object that describes the
		 *	color stops and type of gradient to be used.<br>
		 * {@code origin: Point} — the origin point of the gradient<br>
		 * {@code destination: Point} — the destination point of the gradient
		 * {@code stops: Array of GradientStop} — the gradient stops describing
		 * the gradient, as an alternative to providing a gradient object<br>
		 * {@code radial: Boolean} — controls whether the gradient is radial,
		 * as an alternative to providing a gradient object<br>
		 *
		 * @name Color#initialize
		 * @param {Object} object an object describing the components and
		 * properties of the color
		 *
		 * @example {@paperscript}
		 * // Creating a HSB Color:
		 *
		 * // Create a circle shaped path at {x: 80, y: 50}
		 * // with a radius of 30:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // Create an HSB Color with a hue of 90 degrees, a saturation
		 * // 100% and a brightness of 100%:
		 * circle.fillColor = { hue: 90, saturation: 1, brightness: 1 };
		 *
		 * @example {@paperscript}
		 * // Creating a HSL Color:
		 *
		 * // Create a circle shaped path at {x: 80, y: 50}
		 * // with a radius of 30:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // Create an HSL Color with a hue of 90 degrees, a saturation
		 * // 100% and a lightness of 50%:
		 * circle.fillColor = { hue: 90, saturation: 1, lightness: 0.5 };
		 *
		 * @example {@paperscript height=200}
		 * // Creating a gradient color from an object literal:
		 *
		 * // Define two points which we will be using to construct
		 * // the path and to position the gradient color:
		 * var topLeft = view.center - [80, 80];
		 * var bottomRight = view.center + [80, 80];
		 *
		 * var path = new Path.Rectangle({
		 *	topLeft: topLeft,
		 *	bottomRight: bottomRight,
		 *	// Fill the path with a gradient of three color stops
		 *	// that runs between the two points we defined earlier:
		 *	fillColor: {
		 *		stops: ['yellow', 'red', 'blue'],
		 *		origin: topLeft,
		 *		destination: bottomRight
		 *	}
		 * });
		 */
		/**
		 * Creates a gradient Color object.
		 *
		 * @name Color#initialize
		 * @param {Gradient} gradient
		 * @param {Point} origin
		 * @param {Point} destination
		 * @param {Point} [highlight]
		 *
		 * @example {@paperscript height=200}
		 * // Applying a linear gradient color containing evenly distributed
		 * // color stops:
		 *
		 * // Define two points which we will be using to construct
		 * // the path and to position the gradient color:
		 * var topLeft = view.center - [80, 80];
		 * var bottomRight = view.center + [80, 80];
		 *
		 * // Create a rectangle shaped path between
		 * // the topLeft and bottomRight points:
		 * var path = new Path.Rectangle(topLeft, bottomRight);
		 *
		 * // Create the gradient, passing it an array of colors to be converted
		 * // to evenly distributed color stops:
		 * var gradient = new Gradient(['yellow', 'red', 'blue']);
		 *
		 * // Have the gradient color run between the topLeft and
		 * // bottomRight points we defined earlier:
		 * var gradientColor = new Color(gradient, topLeft, bottomRight);
		 *
		 * // Set the fill color of the path to the gradient color:
		 * path.fillColor = gradientColor;
		 *
		 * @example {@paperscript height=200}
		 * // Applying a radial gradient color containing unevenly distributed
		 * // color stops:
		 *
		 * // Create a circle shaped path at the center of the view
		 * // with a radius of 80:
		 * var path = new Path.Circle({
		 *	   center: view.center,
		 *	   radius: 80
		 * });
		 *
		 * // The stops array: yellow mixes with red between 0 and 15%,
		 * // 15% to 30% is pure red, red mixes with black between 30% to 100%:
		 * var stops = [
		 *	   ['yellow', 0],
		 *	   ['red', 0.15],
		 *	   ['red', 0.3],
		 *	   ['black', 0.9]
		 * ];
		 *
		 * // Create a radial gradient using the color stops array:
		 * var gradient = new Gradient(stops, true);
		 *
		 * // We will use the center point of the circle shaped path as
		 * // the origin point for our gradient color
		 * var from = path.position;
		 *
		 * // The destination point of the gradient color will be the
		 * // center point of the path + 80pt in horizontal direction:
		 * var to = path.position + [80, 0];
		 *
		 * // Create the gradient color:
		 * var gradientColor = new Color(gradient, from, to);
		 *
		 * // Set the fill color of the path to the gradient color:
		 * path.fillColor = gradientColor;
		 */
		initialize: function Color(arg) {
			// We are storing color internally as an array of components
			var slice = Array.prototype.slice,
				args = arguments,
				read = 0,
				type,
				components,
				alpha,
				values;
			// If first argument is an array, replace arguments with it.
			if (Array.isArray(arg)) {
				args = arg;
				arg = args[0];
			}
			// First see if it's a type string argument, and if so, set it and
			// shift it out of the arguments list.
			var argType = arg != null && typeof arg;
			if (argType === 'string' && arg in types) {
				type = arg;
				arg = args[1];
				if (Array.isArray(arg)) {
					// Internal constructor that is called with the following
					// arguments, without parsing: (type, componets, alpha)
					components = arg;
					alpha = args[2];
				} else {
					// For deserialization, shift out and process normally.
					if (this.__read)
						read = 1; // Will be increased below
					// Shift type out of the arguments, and process normally.
					args = slice.call(args, 1);
					argType = typeof arg;
				}
			}
			if (!components) {
				// Determine if there is a values array
				values = argType === 'number'
						? args
						// Do not use Array.isArray() to also support arguments
						: argType === 'object' && arg.length != null
							? arg
							: null;
				// The various branches below produces a values array if the
				// values still need parsing, and a components array if they are
				// already parsed.
				if (values) {
					if (!type)
						// type = values.length >= 4
						//		? 'cmyk'
						//		: values.length >= 3
						type = values.length >= 3
								? 'rgb'
								: 'gray';
					var length = types[type].length;
					alpha = values[length];
					if (this.__read)
						read += values === arguments
							? length + (alpha != null ? 1 : 0)
							: 1;
					if (values.length > length)
						values = slice.call(values, 0, length);
				} else if (argType === 'string') {
					type = 'rgb';
					components = fromCSS(arg);
					if (components.length === 4) {
						alpha = components[3];
						components.length--;
					}
				} else if (argType === 'object') {
					if (arg.constructor === Color) {
						type = arg._type;
						components = arg._components.slice();
						alpha = arg._alpha;
						if (type === 'gradient') {
							// Clone all points, since they belong to the other
							// color already.
							for (var i = 1, l = components.length; i < l; i++) {
								var point = components[i];
								if (point)
									components[i] = point.clone();
							}
						}
					} else if (arg.constructor === Gradient) {
						type = 'gradient';
						values = args;
					} else {
						// Determine type by presence of object property names
						type = 'hue' in arg
							? 'lightness' in arg
								? 'hsl'
								: 'hsb'
							: 'gradient' in arg || 'stops' in arg
									|| 'radial' in arg
								? 'gradient'
								: 'gray' in arg
									? 'gray'
									: 'rgb';
						// Convert to array and parse in one loop, for efficiency
						var properties = types[type],
							parsers = componentParsers[type];
						this._components = components = [];
						for (var i = 0, l = properties.length; i < l; i++) {
							var value = arg[properties[i]];
							// Allow implicit definition of gradients through
							// stops / radial properties. Conversion happens
							// here on the fly:
							if (value == null && i === 0 && type === 'gradient'
									&& 'stops' in arg) {
								value = {
									stops: arg.stops,
									radial: arg.radial
								};
							}
							value = parsers[i].call(this, value);
							if (value != null)
								components[i] = value;
						}
						alpha = arg.alpha;
					}
				}
				if (this.__read && type)
					read = 1;
			}
			// Default fallbacks: rgb, black
			this._type = type || 'rgb';
			// Define this Color's unique id in its own private id pool.
			// NOTE: This is required by SVG Export code!
			this._id = UID.get(Color);
			if (!components) {
				// Produce a components array now, and parse values. Even if no
				// values are defined, parsers are still called to produce
				// defaults.
				this._components = components = [];
				var parsers = componentParsers[this._type];
				for (var i = 0, l = parsers.length; i < l; i++) {
					var value = parsers[i].call(this, values && values[i]);
					if (value != null)
						components[i] = value;
				}
			}
			this._components = components;
			this._properties = types[this._type];
			this._alpha = alpha;
			if (this.__read)
				this.__read = read;
		},

		_serialize: function(options, dictionary) {
			var components = this.getComponents();
			return Base.serialize(
					// We can ommit the type for gray and rgb:
					/^(gray|rgb)$/.test(this._type)
						? components
						: [this._type].concat(components),
					options, true, dictionary);
		},

		/**
		 * Called by various setters whenever a color value changes
		 */
		_changed: function() {
			this._canvasStyle = null;
			if (this._owner)
				this._owner._changed(65);
		},

		/**
		 * @return {Number[]} the converted components as an array
		 */
		_convert: function(type) {
			var converter;
			return this._type === type
					? this._components.slice()
					: (converter = converters[this._type + '-' + type])
						? converter.apply(this, this._components)
						// Convert to and from rgb if no direct converter exists
						: converters['rgb-' + type].apply(this,
							converters[this._type + '-rgb'].apply(this,
								this._components));
		},

		/**
		 * Converts the color another type.
		 *
		 * @param {String('rgb', 'gray', 'hsb', 'hsl')} type the color type to
		 * convert to.
		 * @return {Color} the converted color as a new instance
		 */
		convert: function(type) {
			return new Color(type, this._convert(type), this._alpha);
		},

		/**
		 * The type of the color as a string.
		 *
		 * @type String('rgb', 'gray', 'hsb', 'hsl')
		 * @bean
		 *
		 * @example
		 * var color = new Color(1, 0, 0);
		 * console.log(color.type); // 'rgb'
		 */
		getType: function() {
			return this._type;
		},

		setType: function(type) {
			this._components = this._convert(type);
			this._properties = types[type];
			this._type = type;
		},

		/**
		 * The color components that define the color, including the alpha value
		 * if defined.
		 *
		 * @type Number[]
		 * @bean
		 */
		getComponents: function() {
			var components = this._components.slice();
			if (this._alpha != null)
				components.push(this._alpha);
			return components;
		},

		/**
		 * The color's alpha value as a number between {@code 0} and {@code 1}.
		 * All colors of the different subclasses support alpha values.
		 *
		 * @type Number
		 * @bean
		 * @default 1
		 *
		 * @example {@paperscript}
		 * // A filled path with a half transparent stroke:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // Fill the circle with red and give it a 20pt green stroke:
		 * circle.style = {
		 *	fillColor: 'red',
		 *	strokeColor: 'green',
		 *	strokeWidth: 20
		 * };
		 *
		 * // Make the stroke half transparent:
		 * circle.strokeColor.alpha = 0.5;
		 */
		getAlpha: function() {
			return this._alpha != null ? this._alpha : 1;
		},

		setAlpha: function(alpha) {
			this._alpha = alpha == null ? null : Math.min(Math.max(alpha, 0), 1);
			this._changed();
		},

		/**
		 * Checks if the color has an alpha value.
		 *
		 * @return {Boolean} {@true if the color has an alpha value}
		 */
		hasAlpha: function() {
			return this._alpha != null;
		},

		/**
		 * Checks if the component color values of the color are the
		 * same as those of the supplied one.
		 *
		 * @param {Color} color the color to compare with
		 * @return {Boolean} {@true if the colors are the same}
		 */
		equals: function(color) {
			var col = Base.isPlainValue(color, true)
					? Color.read(arguments)
					: color;
			return col === this || col && this._class === col._class
					&& this._type === col._type
					&& this._alpha === col._alpha
					&& Base.equals(this._components, col._components)
					|| false;
		},

		/**
		 * @name Color#clone
		 * @function
		 *
		 * Returns a copy of the color object.
		 *
		 * @return {Color} a copy of the color object
		 */
		// NOTE: There is no need to actually implement this, since it's the
		// same as Base#clone()

		/**
		 * {@grouptitle String Representations}
		 * @return {String} a string representation of the color
		 */
		toString: function() {
			var properties = this._properties,
				parts = [],
				isGradient = this._type === 'gradient',
				f = Formatter.instance;
			for (var i = 0, l = properties.length; i < l; i++) {
				var value = this._components[i];
				if (value != null)
					parts.push(properties[i] + ': '
							+ (isGradient ? value : f.number(value)));
			}
			if (this._alpha != null)
				parts.push('alpha: ' + f.number(this._alpha));
			return '{ ' + parts.join(', ') + ' }';
		},

		/**
		 * Returns the color as a CSS string.
		 *
		 * @param {Boolean} hex whether to return the color in hexadecial
		 * representation or as a CSS RGB / RGBA string.
		 * @return {String} a CSS string representation of the color
		 */
		toCSS: function(hex) {
			// TODO: Support HSL / HSLA CSS3 colors directly, without conversion
			var components = this._convert('rgb'),
				alpha = hex || this._alpha == null ? 1 : this._alpha;
			function convert(val) {
				return Math.round((val < 0 ? 0 : val > 1 ? 1 : val) * 255);
			}
			components = [
				convert(components[0]),
				convert(components[1]),
				convert(components[2])
			];
			if (alpha < 1)
				components.push(alpha < 0 ? 0 : alpha);
			return hex
					? '#' + ((1 << 24) + (components[0] << 16)
						+ (components[1] << 8)
						+ components[2]).toString(16).slice(1)
					: (components.length == 4 ? 'rgba(' : 'rgb(')
						+ components.join(',') + ')';
		},

		toCanvasStyle: function(ctx) {
			if (this._canvasStyle)
				return this._canvasStyle;
			// Normal colors are simply represented by their CSS string.
			if (this._type !== 'gradient')
				return this._canvasStyle = this.toCSS();
			// Gradient code form here onwards
			var components = this._components,
				gradient = components[0],
				stops = gradient._stops,
				origin = components[1],
				destination = components[2],
				canvasGradient;
			if (gradient._radial) {
				var radius = destination.getDistance(origin),
					highlight = components[3];
				if (highlight) {
					var vector = highlight.subtract(origin);
					if (vector.getLength() > radius)
						highlight = origin.add(vector.normalize(radius - 0.1));
				}
				var start = highlight || origin;
				canvasGradient = ctx.createRadialGradient(start.x, start.y,
						0, origin.x, origin.y, radius);
			} else {
				canvasGradient = ctx.createLinearGradient(origin.x, origin.y,
						destination.x, destination.y);
			}
			for (var i = 0, l = stops.length; i < l; i++) {
				var stop = stops[i];
				canvasGradient.addColorStop(stop._rampPoint,
						stop._color.toCanvasStyle());
			}
			return this._canvasStyle = canvasGradient;
		},

		/**
		 * Transform the gradient color by the specified matrix.
		 *
		 * @param {Matrix} matrix the matrix to transform the gradient color by
		 */
		transform: function(matrix) {
			if (this._type === 'gradient') {
				var components = this._components;
				for (var i = 1, l = components.length; i < l; i++) {
					var point = components[i];
					matrix._transformPoint(point, point, true);
				}
				this._changed();
			}
		},

		/**
		 * {@grouptitle RGB Components}
		 *
		 * The amount of red in the color as a value between {@code 0} and
		 * {@code 1}.
		 *
		 * @name Color#red
		 * @property
		 * @type Number
		 *
		 * @example {@paperscript}
		 * // Changing the amount of red in a color:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 * circle.fillColor = 'blue';
		 *
		 * // Blue + red = purple:
		 * circle.fillColor.red = 1;
		 */
		/**
		 * The amount of green in the color as a value between {@code 0} and
		 * {@code 1}.
		 *
		 * @name Color#green
		 * @property
		 * @type Number
		 *
		 * @example {@paperscript}
		 * // Changing the amount of green in a color:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // First we set the fill color to red:
		 * circle.fillColor = 'red';
		 *
		 * // Red + green = yellow:
		 * circle.fillColor.green = 1;
		 */
		/**
		 * The amount of blue in the color as a value between {@code 0} and
		 * {@code 1}.
		 *
		 * @name Color#blue
		 * @property
		 * @type Number
		 *
		 * @example {@paperscript}
		 * // Changing the amount of blue in a color:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // First we set the fill color to red:
		 * circle.fillColor = 'red';
		 *
		 * // Red + blue = purple:
		 * circle.fillColor.blue = 1;
		 */

		/**
		 * {@grouptitle Gray Components}
		 *
		 * The amount of gray in the color as a value between {@code 0} and
		 * {@code 1}.
		 *
		 * @name Color#gray
		 * @property
		 * @type Number
		 */

		/**
		 * {@grouptitle HSB Components}
		 *
		 * The hue of the color as a value in degrees between {@code 0} and
		 * {@code 360}.
		 *
		 * @name Color#hue
		 * @property
		 * @type Number
		 *
		 * @example {@paperscript}
		 * // Changing the hue of a color:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 * circle.fillColor = 'red';
		 * circle.fillColor.hue += 30;
		 *
		 * @example {@paperscript}
		 * // Hue cycling:
		 *
		 * // Create a rectangle shaped path, using the dimensions
		 * // of the view:
		 * var path = new Path.Rectangle(view.bounds);
		 * path.fillColor = 'red';
		 *
		 * function onFrame(event) {
		 *	path.fillColor.hue += 0.5;
		 * }
		 */
		/**
		 * The saturation of the color as a value between {@code 0} and
		 * {@code 1}.
		 *
		 * @name Color#saturation
		 * @property
		 * @type Number
		 */
		/**
		 * The brightness of the color as a value between {@code 0} and
		 * {@code 1}.
		 *
		 * @name Color#brightness
		 * @property
		 * @type Number
		 */

		/**
		 * {@grouptitle HSL Components}
		 *
		 * The lightness of the color as a value between {@code 0} and
		 * {@code 1}.
		 * Note that all other components are shared with HSB.
		 *
		 * @name Color#lightness
		 * @property
		 * @type Number
		 */

		/**
		 * {@grouptitle Gradient Components}
		 *
		 * The gradient object describing the type of gradient and the stops.
		 *
		 * @name Color#gradient
		 * @property
		 * @type Gradient
		 */

		/* The origin point of the gradient.
		 *
		 * @name Color#origin
		 * @property
		 * @type Point
		 *
		 * @example {@paperscript height=200}
		 * // Move the origin point of the gradient, by moving your mouse over
		 * // the view below:
		 *
		 * // Create a rectangle shaped path with the same dimensions as
		 * // that of the view and fill it with a gradient color:
		 * var path = new Path.Rectangle(view.bounds);
		 * var gradient = new Gradient(['yellow', 'red', 'blue']);
		 *
		 * // Have the gradient color run from the top left point of the view,
		 * // to the bottom right point of the view:
		 * var from = view.bounds.topLeft;
		 * var to = view.bounds.bottomRight;
		 * var gradientColor = new Color(gradient, from, to);
		 * path.fillColor = gradientColor;
		 *
		 * function onMouseMove(event) {
		 *	// Set the origin point of the path's gradient color
		 *	// to the position of the mouse:
		 *	path.fillColor.origin = event.point;
		 * }
		 */

		/*
		 * The destination point of the gradient.
		 *
		 * @name Color#destination
		 * @property
		 * @type Point
		 *
		 * @example {@paperscript height=300}
		 * // Move the destination point of the gradient, by moving your mouse
		 * // over the view below:
		 *
		 * // Create a circle shaped path at the center of the view,
		 * // using 40% of the height of the view as its radius
		 * // and fill it with a radial gradient color:
		 * var path = new Path.Circle({
		 *	center: view.center,
		 *	radius: view.bounds.height * 0.4
		 * });
		 *
		 * var gradient = new Gradient(['yellow', 'red', 'black'], true);
		 * var from = view.center;
		 * var to = view.bounds.bottomRight;
		 * var gradientColor = new Color(gradient, from, to);
		 * path.fillColor = gradientColor;
		 *
		 * function onMouseMove(event) {
		 *	// Set the origin point of the path's gradient color
		 *	// to the position of the mouse:
		 *	path.fillColor.destination = event.point;
		 * }
		 */

		/**
		 * The highlight point of the gradient.
		 *
		 * @name Color#highlight
		 * @property
		 * @type Point
		 *
		 * @example {@paperscript height=300}
		 * // Create a circle shaped path at the center of the view,
		 * // using 40% of the height of the view as its radius
		 * // and fill it with a radial gradient color:
		 * var path = new Path.Circle({
		 *	center: view.center,
		 *	radius: view.bounds.height * 0.4
		 * });
		 *
		 * path.fillColor = {
		 *	gradient: {
		 *		stops: ['yellow', 'red', 'black'],
		 *		radial: true
		 *	},
		 *	origin: path.position,
		 *	destination: path.bounds.rightCenter
		 * };
		 *
		 * function onMouseMove(event) {
		 *	// Set the origin highlight of the path's gradient color
		 *	// to the position of the mouse:
		 *	path.fillColor.highlight = event.point;
		 * }
		 */

		statics: /** @lends Color */{
			// Export for backward compatibility code below.
			_types: types,

			random: function() {
				var random = Math.random;
				return new Color(random(), random(), random());
			}
		}
	});
},
new function() {
	var operators = {
		add: function(a, b) {
			return a + b;
		},

		subtract: function(a, b) {
			return a - b;
		},

		multiply: function(a, b) {
			return a * b;
		},

		divide: function(a, b) {
			return a / b;
		}
	};

	return Base.each(operators, function(operator, name) {
		this[name] = function(color) {
			color = Color.read(arguments);
			var type = this._type,
				components1 = this._components,
				components2 = color._convert(type);
			for (var i = 0, l = components1.length; i < l; i++)
				components2[i] = operator(components1[i], components2[i]);
			return new Color(type, components2,
					this._alpha != null
							? operator(this._alpha, color.getAlpha())
							: null);
		};
	}, /** @lends Color# */{
		/**
		 * Returns the addition of the supplied value to both coordinates of
		 * the color as a new color.
		 * The object itself is not modified!
		 *
		 * @name Color#add
		 * @function
		 * @operator
		 * @param {Number} number the number to add
		 * @return {Color} the addition of the color and the value as a new
		 * color
		 *
		 * @example
		 * var color = new Color(0.5, 1, 1);
		 * var result = color + 1;
		 * console.log(result); // { red: 1, blue: 1, green: 1 }
		 */
		/**
		 * Returns the addition of the supplied color to the color as a new
		 * color.
		 * The object itself is not modified!
		 *
		 * @name Color#add
		 * @function
		 * @operator
		 * @param {Color} color the color to add
		 * @return {Color} the addition of the two colors as a new color
		 *
		 * @example
		 * var color1 = new Color(0, 1, 1);
		 * var color2 = new Color(1, 0, 0);
		 * var result = color1 + color2;
		 * console.log(result); // { red: 1, blue: 1, green: 1 }
		 */
		/**
		 * Returns the subtraction of the supplied value to both coordinates of
		 * the color as a new color.
		 * The object itself is not modified!
		 *
		 * @name Color#subtract
		 * @function
		 * @operator
		 * @param {Number} number the number to subtract
		 * @return {Color} the subtraction of the color and the value as a new
		 * color
		 *
		 * @example
		 * var color = new Color(0.5, 1, 1);
		 * var result = color - 1;
		 * console.log(result); // { red: 0, blue: 0, green: 0 }
		 */
		/**
		 * Returns the subtraction of the supplied color to the color as a new
		 * color.
		 * The object itself is not modified!
		 *
		 * @name Color#subtract
		 * @function
		 * @operator
		 * @param {Color} color the color to subtract
		 * @return {Color} the subtraction of the two colors as a new color
		 *
		 * @example
		 * var color1 = new Color(0, 1, 1);
		 * var color2 = new Color(1, 0, 0);
		 * var result = color1 - color2;
		 * console.log(result); // { red: 0, blue: 1, green: 1 }
		 */
		/**
		 * Returns the multiplication of the supplied value to both coordinates
		 * of the color as a new color.
		 * The object itself is not modified!
		 *
		 * @name Color#multiply
		 * @function
		 * @operator
		 * @param {Number} number the number to multiply
		 * @return {Color} the multiplication of the color and the value as a
		 * new color
		 *
		 * @example
		 * var color = new Color(0.5, 1, 1);
		 * var result = color * 0.5;
		 * console.log(result); // { red: 0.25, blue: 0.5, green: 0.5 }
		 */
		/**
		 * Returns the multiplication of the supplied color to the color as a
		 * new color.
		 * The object itself is not modified!
		 *
		 * @name Color#multiply
		 * @function
		 * @operator
		 * @param {Color} color the color to multiply
		 * @return {Color} the multiplication of the two colors as a new color
		 *
		 * @example
		 * var color1 = new Color(0, 1, 1);
		 * var color2 = new Color(0.5, 0, 0.5);
		 * var result = color1 * color2;
		 * console.log(result); // { red: 0, blue: 0, green: 0.5 }
		 */
		/**
		 * Returns the division of the supplied value to both coordinates of
		 * the color as a new color.
		 * The object itself is not modified!
		 *
		 * @name Color#divide
		 * @function
		 * @operator
		 * @param {Number} number the number to divide
		 * @return {Color} the division of the color and the value as a new
		 * color
		 *
		 * @example
		 * var color = new Color(0.5, 1, 1);
		 * var result = color / 2;
		 * console.log(result); // { red: 0.25, blue: 0.5, green: 0.5 }
		 */
		/**
		 * Returns the division of the supplied color to the color as a new
		 * color.
		 * The object itself is not modified!
		 *
		 * @name Color#divide
		 * @function
		 * @operator
		 * @param {Color} color the color to divide
		 * @return {Color} the division of the two colors as a new color
		 *
		 * @example
		 * var color1 = new Color(0, 1, 1);
		 * var color2 = new Color(0.5, 0, 0.5);
		 * var result = color1 / color2;
		 * console.log(result); // { red: 0, blue: 0, green: 1 }
		 */
	});
});

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
 * @name Gradient
 *
 * @class The Gradient object.
 *
 * @classexample {@paperscript height=300}
 * // Applying a linear gradient color containing evenly distributed
 * // color stops:
 *
 * // Define two points which we will be using to construct
 * // the path and to position the gradient color:
 * var topLeft = view.center - [80, 80];
 * var bottomRight = view.center + [80, 80];
 *
 * // Create a rectangle shaped path between
 * // the topLeft and bottomRight points:
 * var path = new Path.Rectangle({
 *	   topLeft: topLeft,
 *	   bottomRight: bottomRight,
 *	   // Fill the path with a gradient of three color stops
 *	   // that runs between the two points we defined earlier:
 *	   fillColor: {
 *		   gradient: {
 *			   stops: ['yellow', 'red', 'blue']
 *		   },
 *		   origin: topLeft,
 *		   destination: bottomRight
 *	   }
 * });
 *
 * @classexample {@paperscript height=300}
 * // Create a circle shaped path at the center of the view,
 * // using 40% of the height of the view as its radius
 * // and fill it with a radial gradient color:
 * var path = new Path.Circle({
 *	   center: view.center,
 *	   radius: view.bounds.height * 0.4
 * });
 *
 * // Fill the path with a radial gradient color with three stops:
 * // yellow from 0% to 5%, mix between red from 5% to 20%,
 * // mix between red and black from 20% to 100%:
 * path.fillColor = {
 *	   gradient: {
 *		   stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
 *		   radial: true
 *	   },
 *	   origin: path.position,
 *	   destination: path.bounds.rightCenter
 * };
 */
var Gradient = Base.extend(/** @lends Gradient# */{
	_class: 'Gradient',

	// DOCS: Document #initialize()
	initialize: function Gradient(stops, radial) {
		// Use UID here since Gradients are exported through dictionary.add().
		this._id = UID.get();
		if (stops && this._set(stops))
			stops = radial = null;
		if (!this._stops)
			this.setStops(stops || ['white', 'black']);
		if (this._radial == null)
			// Support old string type argument and new radial boolean.
			this.setRadial(typeof radial === 'string' && radial === 'radial'
					|| radial || false);
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this._stops, this._radial],
					options, true, dictionary);
		});
	},

	/**
	 * Called by various setters whenever a gradient value changes
	 */
	_changed: function() {
		// Loop through the gradient-colors that use this gradient and notify
		// them, so they can notify the items they belong to.
		for (var i = 0, l = this._owners && this._owners.length; i < l; i++)
			this._owners[i]._changed();
	},

	/**
	 * Called by Color#setGradient()
	 * This is required to pass on _changed() notifications to the _owners.
	 */
	_addOwner: function(color) {
		if (!this._owners)
			this._owners = [];
		this._owners.push(color);
	},

	/**
	 * Called by Color whenever this gradient stops being used.
	 */
	_removeOwner: function(color) {
		var index = this._owners ? this._owners.indexOf(color) : -1;
		if (index != -1) {
			this._owners.splice(index, 1);
			if (this._owners.length === 0)
				this._owners = undefined;
		}
	},

	/**
	 * @return {Gradient} a copy of the gradient
	 */
	clone: function() {
		var stops = [];
		for (var i = 0, l = this._stops.length; i < l; i++)
			stops[i] = this._stops[i].clone();
		return new Gradient(stops, this._radial);
	},

	/**
	 * The gradient stops on the gradient ramp.
	 *
	 * @type GradientStop[]
	 * @bean
	 */
	getStops: function() {
		return this._stops;
	},

	setStops: function(stops) {
		// If this gradient already contains stops, first remove
		// this gradient as their owner.
		if (this.stops) {
			for (var i = 0, l = this._stops.length; i < l; i++)
				this._stops[i]._owner = undefined;
		}
		if (stops.length < 2)
			throw new Error(
					'Gradient stop list needs to contain at least two stops.');
		this._stops = GradientStop.readAll(stops, 0, { clone: true });
		// Now reassign ramp points if they were not specified.
		for (var i = 0, l = this._stops.length; i < l; i++) {
			var stop = this._stops[i];
			stop._owner = this;
			if (stop._defaultRamp)
				stop.setRampPoint(i / (l - 1));
		}
		this._changed();
	},

	/**
	 * Specifies whether the gradient is radial or linear.
	 *
	 * @type Boolean
	 * @bean
	 */
	getRadial: function() {
		return this._radial;
	},

	setRadial: function(radial) {
		this._radial = radial;
		this._changed();
	},

	/**
	 * Checks whether the gradient is equal to the supplied gradient.
	 *
	 * @param {Gradient} gradient
	 * @return {Boolean} {@true if they are equal}
	 */
	equals: function(gradient) {
		if (gradient === this)
			return true;
		if (gradient && this._class === gradient._class
				&& this._stops.length === gradient._stops.length) {
			for (var i = 0, l = this._stops.length; i < l; i++) {
				if (!this._stops[i].equals(gradient._stops[i]))
					return false;
			}
			return true;
		}
		return false;
	}
});

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

// TODO: Support midPoint? (initial tests didn't look nice)
/**
 * @name GradientStop
 *
 * @class The GradientStop object.
 */
var GradientStop = Base.extend(/** @lends GradientStop# */{
	_class: 'GradientStop',

	/**
	 * Creates a GradientStop object.
	 *
	 * @param {Color} [color=new Color(0, 0, 0)] the color of the stop
	 * @param {Number} [rampPoint=0] the position of the stop on the gradient
	 * ramp as a value between 0 and 1
	 */
	initialize: function GradientStop(arg0, arg1) {
		if (arg0) {
			var color, rampPoint;
			if (arg1 === undefined && Array.isArray(arg0)) {
				// [color, rampPoint]
				color = arg0[0];
				rampPoint = arg0[1];
			} else if (arg0.color) {
				// stop
				color = arg0.color;
				rampPoint = arg0.rampPoint;
			} else {
				// color, rampPoint
				color = arg0;
				rampPoint = arg1;
			}
			this.setColor(color);
			this.setRampPoint(rampPoint);
		}
	},

	// TODO: Do we really need to also clone the color here?
	/**
	 * @return {GradientStop} a copy of the gradient-stop
	 */
	clone: function() {
		return new GradientStop(this._color.clone(), this._rampPoint);
	},

	_serialize: function(options, dictionary) {
		return Base.serialize([this._color, this._rampPoint], options, true,
				dictionary);
	},

	/**
	 * Called by various setters whenever a value changes
	 */
	_changed: function() {
		// Loop through the gradients that use this stop and notify them about
		// the change, so they can notify their gradient colors, which in turn
		// will notify the items they are used in:
		if (this._owner)
			this._owner._changed(65);
	},

	/**
	 * The ramp-point of the gradient stop as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @type Number
	 * @bean
	 *
	 * @example {@paperscript height=300}
	 * // Animating a gradient's ramp points:
	 *
	 * // Create a circle shaped path at the center of the view,
	 * // using 40% of the height of the view as its radius
	 * // and fill it with a radial gradient color:
	 * var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: view.bounds.height * 0.4
	 * });
	 *
	 * path.fillColor = {
	 *	   gradient: {
	 *		   stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
	 *		   radial: true
	 *	   },
	 *	   origin: path.position,
	 *	   destination: path.bounds.rightCenter
	 * };
	 *
	 * var gradient = path.fillColor.gradient;
	 *
	 * // This function is called each frame of the animation:
	 * function onFrame(event) {
	 *	   var blackStop = gradient.stops[2];
	 *	   // Animate the rampPoint between 0.7 and 0.9:
	 *	   blackStop.rampPoint = Math.sin(event.time * 5) * 0.1 + 0.8;
	 *
	 *	   // Animate the rampPoint between 0.2 and 0.4
	 *	   var redStop = gradient.stops[1];
	 *	   redStop.rampPoint = Math.sin(event.time * 3) * 0.1 + 0.3;
	 * }
	 */
	getRampPoint: function() {
		return this._rampPoint;
	},

	setRampPoint: function(rampPoint) {
		this._defaultRamp = rampPoint == null;
		this._rampPoint = rampPoint || 0;
		this._changed();
	},

	/**
	 * The color of the gradient stop.
	 *
	 * @type Color
	 * @bean
	 *
	 * @example {@paperscript height=300}
	 * // Animating a gradient's ramp points:
	 *
	 * // Create a circle shaped path at the center of the view,
	 * // using 40% of the height of the view as its radius
	 * // and fill it with a radial gradient color:
	 * var path = new Path.Circle({
	 *	   center: view.center,
	 *	   radius: view.bounds.height * 0.4
	 * });
	 *
	 * path.fillColor = {
	 *	   gradient: {
	 *		   stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
	 *		   radial: true
	 *	   },
	 *	   origin: path.position,
	 *	   destination: path.bounds.rightCenter
	 * };
	 *
	 * var redStop = path.fillColor.gradient.stops[1];
	 * var blackStop = path.fillColor.gradient.stops[2];
	 *
	 * // This function is called each frame of the animation:
	 * function onFrame(event) {
	 *	   // Animate the rampPoint between 0.7 and 0.9:
	 *	   blackStop.rampPoint = Math.sin(event.time * 5) * 0.1 + 0.8;
	 *
	 *	   // Animate the rampPoint between 0.2 and 0.4
	 *	   redStop.rampPoint = Math.sin(event.time * 3) * 0.1 + 0.3;
	 * }
	 */
	getColor: function() {
		return this._color;
	},

	setColor: function(color) {
		// Make sure newly set colors are cloned, since they can only have
		// one owner.
		this._color = Color.read(arguments);
		if (this._color === color)
			this._color = color.clone();
		this._color._owner = this;
		this._changed();
	},

	equals: function(stop) {
		return stop === this || stop && this._class === stop._class
				&& this._color.equals(stop._color)
				&& this._rampPoint == stop._rampPoint
				|| false;
	}
});

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
 * @name Style
 *
 * @class Style is used for changing the visual styles of items
 * contained within a Paper.js project and is returned by
 * {@link Item#style} and {@link Project#currentStyle}.
 *
 * All properties of Style are also reflected directly in {@link Item},
 * i.e.: {@link Item#fillColor}.
 *
 * To set multiple style properties in one go, you can pass an object to
 * {@link Item#style}. This is a convenient way to define a style once and
 * apply it to a series of items:
 *
 * @classexample {@paperscript} // Styling paths
 *
 * var path = new Path.Circle(new Point(80, 50), 30);
 * path.style = {
 *	   fillColor: new Color(1, 0, 0),
 *	   strokeColor: 'black',
 *	   strokeWidth: 5
 * };
 *
 * @classexample {@paperscript} // Styling text items
 * var text = new PointText(view.center);
 * text.content = 'Hello world.';
 * text.style = {
 *	   fontFamily: 'Courier New',
 *	   fontWeight: 'bold',
 *	   fontSize: 20,
 *	   fillColor: 'red',
 *	   justification: 'center'
 * };
 *
 * @classexample {@paperscript} // Styling groups
 * var path1 = new Path.Circle({
 *	   center: [100, 50],
 *	   radius: 30
 * });
 *
 * var path2 = new Path.Rectangle({
 *	   from: [170, 20],
 *	   to: [230, 80]
 * });
 *
 * var group = new Group(path1, path2);
 *
 * // All styles set on a group are automatically
 * // set on the children of the group:
 * group.style = {
 *	   strokeColor: 'black',
 *	   dashArray: [4, 10],
 *	   strokeWidth: 4,
 *	   strokeCap: 'round'
 * };
 *
 */
var Style = Base.extend(new function() {
	// windingRule / resolution / fillOverprint / strokeOverprint are currently
	// not supported.
	var defaults = {
		// Paths
		fillColor: undefined,
		strokeColor: undefined,
		strokeWidth: 1,
		strokeCap: 'butt',
		strokeJoin: 'miter',
		strokeScaling: true,
		miterLimit: 10,
		dashOffset: 0,
		dashArray: [],
		windingRule: 'nonzero',
		// Shadows
		shadowColor: undefined,
		shadowBlur: 0,
		shadowOffset: new Point(),
		// Selection
		selectedColor: undefined,
		// Characters
		fontFamily: 'sans-serif',
		fontWeight: 'normal',
		fontSize: 12,
		font: 'sans-serif', // deprecated, links to fontFamily
		leading: null,
		// Paragraphs
		justification: 'left'
	};

	var flags = {
		strokeWidth: 97,
		strokeCap: 97,
		strokeJoin: 97,
		// strokeScaling can change the coordinates of cached path items
		strokeScaling: 105,
		miterLimit: 97,
		fontFamily: 9,
		fontWeight: 9,
		fontSize: 9,
		font: 9, // deprecated, links to fontFamily
		leading: 9,
		justification: 9
	};

	// Enforce creation of beans, as bean getters have hidden parameters,
	// see _dontMerge argument below.
	var item = { beans: true },
		fields = {
			_defaults: defaults,
			// Override default fillColor for text items
			_textDefaults: new Base(defaults, {
				fillColor: new Color() // black
			}),
			beans: true
		};

	Base.each(defaults, function(value, key) {
		var isColor = /Color$/.test(key),
			isPoint = key === 'shadowOffset',
			part = Base.capitalize(key),
			flag = flags[key],
			set = 'set' + part,
			get = 'get' + part;

		// Define getters and setters to be injected into this class.
		// This is how style values are handled:
		// - Style values are all stored in this._values
		// - The style object starts with an empty _values object, with fallback
		//	 on _defaults through code in the getter below.
		// - Only the styles that are explicitly set on the object get defined
		//	 in _values.
		// - Color values are not stored as converted colors immediately. The
		//	 raw value is stored, and conversion only happens in the getter.
		fields[set] = function(value) {
			var owner = this._owner,
				children = owner && owner._children;
			// Only unify styles on children of Groups, excluding CompoundPaths.
			if (children && children.length > 0
					&& !(owner instanceof CompoundPath)) {
				for (var i = 0, l = children.length; i < l; i++)
					children[i]._style[set](value);
			} else {
				var old = this._values[key];
				if (old !== value) {
					if (isColor) {
						if (old)
							old._owner = undefined;
						if (value && value.constructor === Color) {
							// Clone color if it already has an owner.
							// NOTE: If value is not a Color, it is only
							// converted and cloned in the getter further down.
							if (value._owner)
								value = value.clone();
							value._owner = owner;
						}
					}
					// Note: We do not convert the values to Colors in the
					// setter. This only happens once the getter is called.
					this._values[key] = value;
					// Notify the owner of the style change STYLE is always set,
					// additional flags come from flags, as used for STROKE:
					if (owner)
						owner._changed(flag || 65);
				}
			}
		};

		fields[get] = function(_dontMerge) {
			var owner = this._owner,
				children = owner && owner._children,
				value;
			// If the owner has children, walk through all of them and see if
			// they all have the same style.
			// If true is passed for _dontMerge, don't merge children styles
			if (!children || children.length === 0 || _dontMerge
					|| owner instanceof CompoundPath) {
				var value = this._values[key];
				if (value === undefined) {
					value = this._defaults[key];
					if (value && value.clone)
						value = value.clone();
				} else {
					var ctor = isColor ? Color : isPoint ? Point : null;
					if (ctor && !(value && value.constructor === ctor)) {
						// Convert to a Color / Point, and stored result of the
						// conversion.
						this._values[key] = value = ctor.read([value], 0,
								{ readNull: true, clone: true });
						if (value && isColor)
							value._owner = owner;
					}
				}
				return value;
			}
			for (var i = 0, l = children.length; i < l; i++) {
				var childValue = children[i]._style[get]();
				if (i === 0) {
					value = childValue;
				} else if (!Base.equals(value, childValue)) {
					// If there is another child with a different
					// style, the style is not defined:
					return undefined;
				}
			}
			return value;
		};

		// Inject style getters and setters into the Item class, which redirect
		// calls to the linked style object.
		item[get] = function(_dontMerge) {
			return this._style[get](_dontMerge);
		};

		item[set] = function(value) {
			this._style[set](value);
		};
	});

	Item.inject(item);
	return fields;
}, /** @lends Style# */{
	_class: 'Style',

	initialize: function Style(style, _owner, _project) {
		// We keep values in a separate object that we can iterate over.
		this._values = {};
		this._owner = _owner;
		this._project = _owner && _owner._project || _project || paper.project;
		if (_owner instanceof TextItem)
			this._defaults = this._textDefaults;
		if (style)
			this.set(style);
	},

	set: function(style) {
		// If the passed style object is also a Style, clone its clonable
		// fields rather than simply copying them.
		var isStyle = style instanceof Style,
			// Use the other stlyle's _values object for iteration
			values = isStyle ? style._values : style;
		if (values) {
			for (var key in values) {
				if (key in this._defaults) {
					var value = values[key];
					// Delegate to setter, so Group styles work too.
					this[key] = value && isStyle && value.clone
							? value.clone() : value;
				}
			}
		}
	},

	equals: function(style) {
		return style === this || style && this._class === style._class
				&& Base.equals(this._values, style._values)
				|| false;
	},

	// DOCS: Style#hasFill()
	hasFill: function() {
		return !!this.getFillColor();
	},

	// DOCS: Style#hasStroke()
	hasStroke: function() {
		return !!this.getStrokeColor() && this.getStrokeWidth() > 0;
	},

	// DOCS: Style#hasShadow()
	hasShadow: function() {
		return !!this.getShadowColor() && this.getShadowBlur() > 0;
	},

	/**
	 * The view that this style belongs to.
	 * @type View
	 * @bean
	 */
	getView: function() {
		return this._project.getView();
	},

	// Overrides

	getFontStyle: function() {
		var fontSize = this.getFontSize();
		// To prevent an obscure iOS 7 crash, we have to convert the size to a
		// string first before passing it to the regular expression.
		// The following nonsensical statement would also prevent the bug,
		// proving that the issue is not the regular expression itself, but
		// something deeper down in the optimizer:
		// `if (size === 0) size = 0;`
		return this.getFontWeight()
				+ ' ' + fontSize + (/[a-z]/i.test(fontSize + '') ? ' ' : 'px ')
				+ this.getFontFamily();
	},

	/**
	 * @private
	 * @bean
	 * @deprecated use {@link #fontFamily} instead.
	 */
	getFont: '#getFontFamily',
	setFont: '#setFontFamily',

	getLeading: function getLeading() {
		// Override leading to return fontSize * 1.2 by default.
		var leading = getLeading.base.call(this),
			fontSize = this.getFontSize();
		if (/pt|em|%|px/.test(fontSize))
			fontSize = this.getView().getPixelSize(fontSize);
		return leading != null ? leading : fontSize * 1.2;
	}

	// DOCS: why isn't the example code showing up?
	/**
	 * Style objects don't need to be created directly. Just pass an object to
	 * {@link Item#style} or {@link Project#currentStyle}, it will be converted
	 * to a Style object internally.
	 *
	 * @name Style#initialize
	 * @param {Object} style
	 */

	/**
	 * {@grouptitle Stroke Style}
	 *
	 * The color of the stroke.
	 *
	 * @name Style#strokeColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the stroke color of a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set its stroke color to RGB red:
	 * circle.strokeColor = new Color(1, 0, 0);
	 */

	/**
	 * The width of the stroke.
	 *
	 * @name Style#strokeWidth
	 * @property
	 * @default 1
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Setting an item's stroke width:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set its stroke color to black:
	 * circle.strokeColor = 'black';
	 *
	 * // Set its stroke width to 10:
	 * circle.strokeWidth = 10;
	 */

	/**
	 * The shape to be used at the beginning and end of open {@link Path} items,
	 * when they have a stroke.
	 *
	 * @name Style#strokeCap
	 * @property
	 * @default 'butt'
	 * @type String('round', 'square', 'butt')
	 *
	 * @example {@paperscript height=200}
	 * // A look at the different stroke caps:
	 *
	 * var line = new Path(new Point(80, 50), new Point(420, 50));
	 * line.strokeColor = 'black';
	 * line.strokeWidth = 20;
	 *
	 * // Select the path, so we can see where the stroke is formed:
	 * line.selected = true;
	 *
	 * // Set the stroke cap of the line to be round:
	 * line.strokeCap = 'round';
	 *
	 * // Copy the path and set its stroke cap to be square:
	 * var line2 = line.clone();
	 * line2.position.y += 50;
	 * line2.strokeCap = 'square';
	 *
	 * // Make another copy and set its stroke cap to be butt:
	 * var line2 = line.clone();
	 * line2.position.y += 100;
	 * line2.strokeCap = 'butt';
	 */

	/**
	 * The shape to be used at the segments and corners of {@link Path} items
	 * when they have a stroke.
	 *
	 * @name Style#strokeJoin
	 * @property
	 * @default 'miter'
	 * @type String('miter', 'round', 'bevel')
	 *
	 * @example {@paperscript height=120}
	 * // A look at the different stroke joins:
	 * var path = new Path();
	 * path.add(new Point(80, 100));
	 * path.add(new Point(120, 40));
	 * path.add(new Point(160, 100));
	 * path.strokeColor = 'black';
	 * path.strokeWidth = 20;
	 *
	 * // Select the path, so we can see where the stroke is formed:
	 * path.selected = true;
	 *
	 * var path2 = path.clone();
	 * path2.position.x += path2.bounds.width * 1.5;
	 * path2.strokeJoin = 'round';
	 *
	 * var path3 = path2.clone();
	 * path3.position.x += path3.bounds.width * 1.5;
	 * path3.strokeJoin = 'bevel';
	 */

	/**
	 * Specifies whether the stroke is to be drawn taking the current affine
	 * transformation into account (the default behavior), or whether it should
	 * appear as a non-scaling stroke.
	 *
	 * @name Style#strokeScaling
	 * @property
	 * @default true
	 * @type Boolean
	 */

	/**
	 * The dash offset of the stroke.
	 *
	 * @name Style#dashOffset
	 * @property
	 * @default 0
	 * @type Number
	 */

	/**
	 * Specifies an array containing the dash and gap lengths of the stroke.
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle(new Point(80, 50), 40);
	 * path.strokeWidth = 2;
	 * path.strokeColor = 'black';
	 *
	 * // Set the dashed stroke to [10pt dash, 4pt gap]:
	 * path.dashArray = [10, 4];
	 *
	 * @name Style#dashArray
	 * @property
	 * @default []
	 * @type Array
	 */

	/**
	 * The miter limit of the stroke. When two line segments meet at a sharp
	 * angle and miter joins have been specified for {@link #strokeJoin}, it is
	 * possible for the miter to extend far beyond the {@link #strokeWidth} of
	 * the path. The miterLimit imposes a limit on the ratio of the miter length
	 * to the {@link #strokeWidth}.
	 *
	 * @name Style#miterLimit
	 * @property
	 * @default 10
	 * @type Number
	 */

	/**
	 * {@grouptitle Fill Style}
	 *
	 * The fill color.
	 *
	 * @name Style#fillColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the fill color of a path to red:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set the fill color of the circle to RGB red:
	 * circle.fillColor = new Color(1, 0, 0);
	 */

	/**
	 * {@grouptitle Shadow Style}
	 *
	 * The shadow color.
	 *
	 * @property
	 * @name Style#shadowColor
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Creating a circle with a black shadow:
	 *
	 * var circle = new Path.Circle({
	 *	   center: [80, 50],
	 *	   radius: 35,
	 *	   fillColor: 'white',
	 *	   // Set the shadow color of the circle to RGB black:
	 *	   shadowColor: new Color(0, 0, 0),
	 *	   // Set the shadow blur radius to 12:
	 *	   shadowBlur: 12,
	 *	   // Offset the shadow by { x: 5, y: 5 }
	 *	   shadowOffset: new Point(5, 5)
	 * });
	 */

	/**
	 * The shadow's blur radius.
	 *
	 * @property
	 * @default 0
	 * @name Style#shadowBlur
	 * @type Number
	 */

	/**
	 * The shadow's offset.
	 *
	 * @property
	 * @default 0
	 * @name Style#shadowOffset
	 * @type Point
	 */

	/**
	 * {@grouptitle Selection Style}
	 *
	 * The color the item is highlighted with when selected. If the item does
	 * not specify its own color, the color defined by its layer is used instead.
	 *
	 * @name Style#selectedColor
	 * @property
	 * @type Color
	 */

	/**
	 * {@grouptitle Character Style}
	 *
	 * The font-family to be used in text content.
	 *
	 * @name Style#fontFamily
	 * @default 'sans-serif'
	 * @type String
	 */

	/**
	 *
	 * The font-weight to be used in text content.
	 *
	 * @name Style#fontWeight
	 * @default 'normal'
	 * @type String|Number
	 */

	/**
	 * The font size of text content, as a number in pixels, or as a string
	 * with optional units {@code 'px'}, {@code 'pt'} and {@code 'em'}.
	 *
	 * @name Style#fontSize
	 * @default 10
	 * @type Number|String
	 */

	/**
	 *
	 * The font-family to be used in text content, as one string.
	 *
	 * @name Style#font
	 * @default 'sans-serif'
	 * @type String
	 * @deprecated use {@link #fontFamily} instead.
	 */

	/**
	 * The text leading of text content.
	 *
	 * @name Style#leading
	 * @default fontSize * 1.2
	 * @type Number|String
	 */

	/**
	 * {@grouptitle Paragraph Style}
	 *
	 * The justification of text paragraphs.
	 *
	 * @name Style#justification
	 * @default 'left'
	 * @type String('left', 'right', 'center')
	 */
});


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

// Node.js emulation layer of browser based environment, based on node-canvas
// and jsdom.

// console.log(__dirname);

var jsdom = require('jsdom'),
	domToHtml = require('jsdom/lib/jsdom/browser/domtohtml').domToHtml,
	// Node Canvas library: https://github.com/learnboost/node-canvas
	Canvas = require('canvas'),
	// Expose global browser variables and create a document and a window using
	// jsdom, e.g. for import/exportSVG()
	document = jsdom.jsdom('<html><body></body></html>'),
	window = document.defaultView,
	navigator = window.navigator,
	HTMLCanvasElement = Canvas,
	Image = Canvas.Image;

// Define XMLSerializer and DOMParser shims, to emulate browser behavior.
// TODO: Put this into a simple node module, with dependency on jsdom?
function XMLSerializer() {
}

XMLSerializer.prototype.serializeToString = function(node) {
	var text = domToHtml(node);
	// Fix a jsdom issue where all SVG tagNames are lowercased:
	// https://github.com/tmpvar/jsdom/issues/620
	var tagNames = ['linearGradient', 'radialGradient', 'clipPath'];
	for (var i = 0, l = tagNames.length; i < l; i++) {
		var tagName = tagNames[i];
		text = text.replace(
			new RegExp('(<|</)' + tagName.toLowerCase() + '\\b', 'g'),
			function(all, start) {
				return start + tagName;
			});
	}
	return text;
};

function DOMParser() {
}

DOMParser.prototype.parseFromString = function(string, contenType) {
	var div = document.createElement('div');
	div.innerHTML = string;
	return div.firstChild;
};

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
 * @name DomElement
 * @namespace
 * @private
 */
var DomElement = new function() {
	// Handles both getting and setting of vendor prefix values
	function handlePrefix(el, name, set, value) {
		var prefixes = ['', 'webkit', 'moz', 'Moz', 'ms', 'o'],
			suffix = name[0].toUpperCase() + name.substring(1);
		for (var i = 0; i < 6; i++) {
			var prefix = prefixes[i],
				key = prefix ? prefix + suffix : name;
			if (key in el) {
				if (set) {
					el[key] = value;
				} else {
					return el[key];
				}
				break;
			}
		}
	}

	return /** @lends DomElement */{
		getStyles: function(el) {
			// If el is a document (nodeType == 9), use it directly
			var doc = el && el.nodeType !== 9 ? el.ownerDocument : el,
				view = doc && doc.defaultView;
			return view && view.getComputedStyle(el, '');
		},

		getBounds: function(el, viewport) {
			var doc = el.ownerDocument,
				body = doc.body,
				html = doc.documentElement,
				rect;
			try {
				// On IE, for nodes that are not inside the DOM, this throws an
				// exception. Emulate the behavior of all other browsers, which
				// return a rectangle of 0 dimensions.
				rect = el.getBoundingClientRect();
			} catch (e) {
				rect = { left: 0, top: 0, width: 0, height: 0 };
			}
			var x = rect.left - (html.clientLeft || body.clientLeft || 0),
				y = rect.top - (html.clientTop || body.clientTop || 0);
			if (!viewport) {
				var view = doc.defaultView;
				x += view.pageXOffset || html.scrollLeft || body.scrollLeft;
				y += view.pageYOffset || html.scrollTop || body.scrollTop;
			}
			return new Rectangle(x, y, rect.width, rect.height);
		},

		getViewportBounds: function(el) {
			var doc = el.ownerDocument,
				view = doc.defaultView,
				html = doc.documentElement;
			return new Rectangle(0, 0,
				view.innerWidth || html.clientWidth,
				view.innerHeight || html.clientHeight
			);
		},

		getOffset: function(el, viewport) {
			return DomElement.getBounds(el, viewport).getPoint();
		},

		getSize: function(el) {
			return DomElement.getBounds(el, true).getSize();
		},

		/**
		 * Checks if element is invisibile (display: none, ...)
		 */
		isInvisible: function(el) {
			return DomElement.getSize(el).equals(new Size(0, 0));
		},

		/**
		 * Checks if element is visibile in current viewport
		 */
		isInView: function(el) {
			// See if the viewport bounds intersect with the windows rectangle
			// which always starts at 0, 0
			return !DomElement.isInvisible(el)
					&& DomElement.getViewportBounds(el).intersects(
						DomElement.getBounds(el, true));
		},

		/**
		 * Gets the given property from the element, trying out all browser
		 * prefix variants.
		 */
		getPrefixed: function(el, name) {
			return handlePrefix(el, name);
		},

		setPrefixed: function(el, name, value) {
			if (typeof name === 'object') {
				for (var key in name)
					handlePrefix(el, key, true, name[key]);
			} else {
				handlePrefix(el, name, true, value);
			}
		}
	};
};


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
 * @name View
 *
 * @class The View object wraps an HTML element and handles drawing and user
 * interaction through mouse and keyboard for it. It offer means to scroll the
 * view, find the currently visible bounds in project coordinates, or the
 * center, both useful for constructing artwork that should appear centered on
 * screen.
 */
var View = Base.extend(Emitter, /** @lends View# */{
	_class: 'View',

	initialize: function View(project, element) {
		// Store reference to the currently active global paper scope, and the
		// active project, which will be represented by this view
		this._project = project;
		this._scope = project._scope;
		this._element = element;
		var size;
		// Sub-classes may set _pixelRatio first
		if (!this._pixelRatio)
			this._pixelRatio = 1;
		// Generate an id for this view
		this._id = 'view-' + View._id++;
		size = new Size(element.width, element.height);
		// Keep track of views internally
		View._views.push(this);
		// Link this id to our view
		View._viewsById[this._id] = this;
		this._viewSize = size;
		(this._matrix = new Matrix())._owner = this;
		this._zoom = 1;
		// Make sure the first view is focused for keyboard input straight away
		if (!View._focused)
			View._focused = this;
		// Items that need the onFrame handler called on them
		this._frameItems = {};
		this._frameItemCount = 0;
	},

	/**
	 * Removes this view from the project and frees the associated element.
	 */
	remove: function() {
		if (!this._project)
			return false;
		// Clear focus if removed view had it
		if (View._focused === this)
			View._focused = null;
		// Remove view from internal structures
		View._views.splice(View._views.indexOf(this), 1);
		delete View._viewsById[this._id];
		// Unlink from project
		if (this._project._view === this)
			this._project._view = null;
		this._element = this._project = null;
		// Remove all onFrame handlers.
		// TODO: Shouldn't we remove all handlers, automatically
		this.off('frame');
		this._animate = false;
		this._frameItems = {};
		return true;
	},

	_events: Base.each(['onResize', 'onMouseDown', 'onMouseUp', 'onMouseMove'],
		function(name) {
			this[name] = {
				install: function(type) {
					this._installEvent(type);
				},

				uninstall: function(type) {
					this._uninstallEvent(type);
				}
			};
		}, {
			onFrame: {
				install: function() {
					this.play();
				},

				uninstall: function() {
					this.pause();
				}
			}
		}
	),

	// These are default values for event related properties on the prototype.
	// Writing item._count++ does not change the defaults, it creates / updates
	// the property on the instance. Useful!
	_animate: false,
	_time: 0,
	_count: 0,

	_requestFrame: function() {
	},

	_handleFrame: function() {
		// Set the global paper object to the current scope
		paper = this._scope;
		var now = Date.now() / 1000,
			delta = this._before ? now - this._before : 0;
		this._before = now;
		this._handlingFrame = true;
		// Use new Base() to convert into a Base object, for #toString()
		this.emit('frame', new Base({
			// Time elapsed since last redraw in seconds:
			delta: delta,
			// Time since first call of frame() in seconds:
			time: this._time += delta,
			count: this._count++
		}));
		// Update framerate stats
		if (this._stats)
			this._stats.update();
		this._handlingFrame = false;
		// Automatically update view on each frame.
		this.update();
	},

	_animateItem: function(item, animate) {
		var items = this._frameItems;
		if (animate) {
			items[item._id] = {
				item: item,
				// Additional information for the event callback
				time: 0,
				count: 0
			};
			if (++this._frameItemCount === 1)
				this.on('frame', this._handleFrameItems);
		} else {
			delete items[item._id];
			if (--this._frameItemCount === 0) {
				// If this is the last one, just stop animating straight away.
				this.off('frame', this._handleFrameItems);
			}
		}
	},

	// Handles _frameItems and fires the 'frame' event on them.
	_handleFrameItems: function(event) {
		for (var i in this._frameItems) {
			var entry = this._frameItems[i];
			entry.item.emit('frame', new Base(event, {
				// Time since first call of frame() in seconds:
				time: entry.time += event.delta,
				count: entry.count++
			}));
		}
	},

	_update: function() {
		this._project._needsUpdate = true;
		if (this._handlingFrame)
			return;
		if (this._animate) {
			// If we're animating, call _handleFrame staight away, but without
			// requesting another animation frame.
			this._handleFrame();
		} else {
			// Otherwise simply update the view now
			this.update();
		}
	},

	/**
	 * Private notifier that is called whenever a change occurs in this view.
	 * Used only by Matrix for now.
	 *
	 * @param {ChangeFlag} flags describes what exactly has changed
	 */
	_changed: function(flags) {
		if (flags & 1)
			this._project._needsUpdate = true;
	},

	_transform: function(matrix) {
		this._matrix.concatenate(matrix);
		// Force recalculation of these values next time they are requested.
		this._bounds = null;
		this._update();
	},

	/**
	 * The underlying native element.
	 *
	 * @type HTMLCanvasElement
	 * @bean
	 */
	getElement: function() {
		return this._element;
	},

	/**
	 * The ratio between physical pixels and device-independent pixels (DIPs)
	 * of the underlying canvas / device.
	 * It is {@code 1} for normal displays, and {@code 2} or more for
	 * high-resolution displays.
	 *
	 * @type Number
	 * @bean

	 */
	getPixelRatio: function() {
		return this._pixelRatio;
	},

	/**
	 * The resoltuion of the underlying canvas / device in pixel per inch (DPI).
	 * It is {@code 72} for normal displays, and {@code 144} for high-resolution
	 * displays with a pixel-ratio of {@code 2}.
	 *
	 * @type Number
	 * @bean
	 */
	getResolution: function() {
		return this._pixelRatio * 72;
	},

	/**
	 * The size of the view. Changing the view's size will resize it's
	 * underlying element.
	 *
	 * @type Size
	 * @bean
	 */
	getViewSize: function() {
		var size = this._viewSize;
		return new LinkedSize(size.width, size.height, this, 'setViewSize');
	},

	setViewSize: function(/* size */) {
		var size = Size.read(arguments),
			delta = size.subtract(this._viewSize);
		if (delta.isZero())
			return;
		this._viewSize.set(size.width, size.height);
		this._setViewSize(size);
		this._bounds = null; // Force recalculation
		// Call onResize handler on any size change
		this.emit('resize', {
			size: size,
			delta: delta
		});
		this._update();
	},

	/**
	 * Private method, overriden in CanvasView for HiDPI support.
	 */
	_setViewSize: function(size) {
		var element = this._element;
		element.width = size.width;
		element.height = size.height;
	},

	/**
	 * The bounds of the currently visible area in project coordinates.
	 *
	 * @type Rectangle
	 * @bean
	 */
	getBounds: function() {
		if (!this._bounds)
			this._bounds = this._matrix.inverted()._transformBounds(
					new Rectangle(new Point(), this._viewSize));
		return this._bounds;
	},

	/**
	 * The size of the visible area in project coordinates.
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function() {
		return this.getBounds().getSize();
	},

	/**
	 * The center of the visible area in project coordinates.
	 *
	 * @type Point
	 * @bean
	 */
	getCenter: function() {
		return this.getBounds().getCenter();
	},

	setCenter: function(/* center */) {
		var center = Point.read(arguments);
		this.scrollBy(center.subtract(this.getCenter()));
	},

	/**
	 * The zoom factor by which the project coordinates are magnified.
	 *
	 * @type Number
	 * @bean
	 */
	getZoom: function() {
		return this._zoom;
	},

	setZoom: function(zoom) {
		// TODO: Clamp the view between 1/32 and 64, just like Illustrator?
		this._transform(new Matrix().scale(zoom / this._zoom,
			this.getCenter()));
		this._zoom = zoom;
	},

	/**
	 * Checks whether the view is currently visible within the current browser
	 * viewport.
	 *
	 * @return {Boolean} whether the view is visible
	 */
	isVisible: function() {
		return DomElement.isInView(this._element);
	},

	/**
	 * Scrolls the view by the given vector.
	 *
	 * @param {Point} point
	 */
	scrollBy: function(/* point */) {
		this._transform(new Matrix().translate(Point.read(arguments).negate()));
	},

	/**
	 * Makes all animation play by adding the view to the request animation
	 * loop.
	 */
	play: function() {
		this._animate = true;
	},

	/**
	 * Makes all animation pause by removing the view to the request animation
	 * loop.
	 */
	pause: function() {
		this._animate = false;
	},

	/**
	 * Updates the view if there are changes. Note that when using built-in
	 * event hanlders for interaction, animation and load events, this method is
	 * invoked for you automatically at the end.
	 *
	 * @name View#update
	 * @function
	 * @param {Boolean} [force=false] {@true if the view should be updated even
	 * if no change has happened}
	 * @return {Boolean} {@true if the view was updated}
	 */
	// update: function(force) {
	// },

	/**
	 * Updates the view if there are changes.
	 *
	 * @deprecated use {@link #update()} instead.
	 */
	draw: function() {
		this.update();
	},

	// TODO: getInvalidBounds
	// TODO: invalidate(rect)
	// TODO: style: artwork / preview / raster / opaque / ink
	// TODO: getShowGrid
	// TODO: getMousePoint
	// TODO: projectToView(rect)

	// DOCS: projectToView(point), viewToProject(point)
	/**
	 * @param {Point} point
	 * @return {Point}
	 */
	projectToView: function(/* point */) {
		return this._matrix._transformPoint(Point.read(arguments));
	},

	/**
	 * @param {Point} point
	 * @return {Point}
	 */
	viewToProject: function(/* point */) {
		return this._matrix._inverseTransform(Point.read(arguments));
	}

	/**
	 * {@grouptitle Event Handlers}
	 * Handler function to be called on each frame of an animation.
	 * The function receives an event object which contains information about
	 * the frame event:
	 *
	 * @option event.count {Number} the number of times the frame event was
	 * fired
	 * @option event.time {Number} the total amount of time passed since the
	 * first frame event in seconds
	 * @option event.delta {Number} the time passed in seconds since the last
	 * frame event
	 *
	 * @example {@paperscript}
	 * // Creating an animation:
	 *
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * function onFrame(event) {
	 *	   // Every frame, rotate the path by 3 degrees:
	 *	   path.rotate(3);
	 * }
	 *
	 * @name View#onFrame
	 * @property
	 * @type Function
	 */

	/**
	 * Handler function that is called whenever a view is resized.
	 *
	 * @example
	 * // Repositioning items when a view is resized:
	 *
	 * // Create a circle shaped path in the center of the view:
	 * var path = new Path.Circle(view.bounds.center, 30);
	 * path.fillColor = 'red';
	 *
	 * function onResize(event) {
	 *	   // Whenever the view is resized, move the path to its center:
	 *	   path.position = view.center;
	 * }
	 *
	 * @name View#onResize
	 * @property
	 * @type Function
	 */
	/**
	 * {@grouptitle Event Handling}
	 *
	 * Attach an event handler to the view.
	 *
	 * @name View#on
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Function} function The function to be called when the event
	 * occurs
	 * @return {View} this view itself, so calls can be chained
	 *
	 * @example {@paperscript}
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * var frameHandler = function(event) {
	 *	   // Every frame, rotate the path by 3 degrees:
	 *	   path.rotate(3);
	 * };
	 *
	 * view.on('frame', frameHandler);
	 */
	/**
	 * Attach one or more event handlers to the view.
	 *
	 * @name View#on
	 * @function
	 * @param {Object} param an object literal containing one or more of the
	 * following properties: {@code frame, resize}
	 * @return {View} this view itself, so calls can be chained
	 *
	 * @example {@paperscript}
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * var frameHandler = function(event) {
	 *	   // Every frame, rotate the path by 3 degrees:
	 *	   path.rotate(3);
	 * };
	 *
	 * view.on({
	 *	   frame: frameHandler
	 * });
	 */

	/**
	 * Detach an event handler from the view.
	 *
	 * @name View#off
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Function} function The function to be detached
	 * @return {View} this view itself, so calls can be chained
	 *
	 * @example {@paperscript}
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * var frameHandler = function(event) {
	 *	   // Every frame, rotate the path by 3 degrees:
	 *	   path.rotate(3);
	 * };
	 *
	 * view.on({
	 *	   frame: frameHandler
	 * });
	 *
	 * // When the user presses the mouse,
	 * // detach the frame handler from the view:
	 * function onMouseDown(event) {
	 *	   view.off('frame');
	 * }
	 */
	/**
	 * Detach one or more event handlers from the view.
	 *
	 * @name View#off
	 * @function
	 * @param {Object} param an object literal containing one or more of the
	 * following properties: {@code frame, resize}
	 * @return {View} this view itself, so calls can be chained
	 */

	/**
	 * Emit an event on the view.
	 *
	 * @name View#emit
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Object} event an object literal containing properties describing
	 * the event
	 * @return {Boolean} {@true if the event had listeners}
	 */

	/**
	 * Check if the view has one or more event handlers of the specified type.
	 *
	 * @name View#responds
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @return {Boolean} {@true if the view has one or more event handlers of
	 * the specified type}
	 */
}, {
	statics: {
		_views: [],
		_viewsById: {},
		_id: 0,

		create: function(project, element) {
			// Factory to provide the right View subclass for a given element.
			// Produces only CanvasViews for now:
			return new CanvasView(project, element);
		}
	}
},
new function() { // Injection scope for mouse events on the browser
});

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
 * @name CanvasView
 * @class
 * @private
 */
var CanvasView = View.extend(/** @lends CanvasView# */{
	_class: 'CanvasView',

	/**
	 * Creates a view object that wraps a canvas element.
	 *
	 * @name CanvasView#initialize
	 * @param {HTMLCanvasElement} canvas the canvas object that this view should
	 * wrap
	 */
	/**
	 * Creates a view object that wraps a newly created canvas element.
	 *
	 * @name CanvasView#initialize
	 * @param {Size} size the size of the canvas to be created
	 */
	initialize: function CanvasView(project, canvas) {
		// Handle canvas argument
		if (!(canvas instanceof HTMLCanvasElement)) {
			// See if the arguments describe the view size:
			var size = Size.read(arguments, 1);
			if (size.isZero())
				throw new Error(
						'Cannot create CanvasView with the provided argument: '
						+ [].slice.call(arguments, 1));
			canvas = CanvasProvider.getCanvas(size);
		}
		this._context = canvas.getContext('2d');
		// Have Item count installed mouse events.
		this._eventCounters = {};
		this._pixelRatio = 1;
		View.call(this, project, canvas);
	},

	_setViewSize: function(size) {
		var element = this._element,
			pixelRatio = this._pixelRatio,
			width = size.width,
			height = size.height;
		// Upscale the canvas if the pixel ratio is more than 1.
		element.width = width * pixelRatio;
		element.height = height * pixelRatio;
		if (pixelRatio !== 1) {
			// We need to set the correct size on non-resizable canvases through
			// their style when HiDPI is active, as otherwise they would appear
			// too big.
			if (!PaperScope.hasAttribute(element, 'resize')) {
				var style = element.style;
				style.width = width + 'px';
				style.height = height + 'px';
			}
			// Scale the context to counter the fact that we've manually scaled
			// our canvas element.
			this._context.scale(pixelRatio, pixelRatio);
		}
	},

	/**
	 * Converts the provide size in any of the units allowed in the browser to
	 * pixels.
	 */
	getPixelSize: function(size) {
		var browser = paper.browser,
			pixels;
		if (browser && browser.firefox) {
			// Firefox doesn't appear to convert  context.font sizes to pixels,
			// while other browsers do. Workaround:
			var parent = this._element.parentNode,
				temp = document.createElement('div');
			temp.style.fontSize = size;
			parent.appendChild(temp);
			pixels = parseFloat(DomElement.getStyles(temp).fontSize);
			parent.removeChild(temp);
		} else {
			var ctx = this._context,
				prevFont = ctx.font;
			ctx.font = size + ' serif';
			pixels = parseFloat(ctx.font);
			ctx.font = prevFont;
		}
		return pixels;
	},

	getTextWidth: function(font, lines) {
		var ctx = this._context,
			prevFont = ctx.font,
			width = 0;
		ctx.font = font;
		// Measure the real width of the text. Unfortunately, there is no sane
		// way to measure text height with canvas.
		for (var i = 0, l = lines.length; i < l; i++)
			width = Math.max(width, ctx.measureText(lines[i]).width);
		ctx.font = prevFont;
		return width;
	},

	/**
	 * Updates the view if there are changes. Note that when using built-in
	 * event hanlders for interaction, animation and load events, this method is
	 * invoked for you automatically at the end.
	 *
	 * @param {Boolean} [force=false] {@true if the view should be updated even
	 * if no change has happened}
	 * @return {Boolean} {@true if the view was updated}
	 */
	update: function(force) {
		var project = this._project;
		if (!project || !force && !project._needsUpdate)
			return false;
		// Initial tests conclude that clearing the canvas using clearRect
		// is always faster than setting canvas.width = canvas.width
		// http://jsperf.com/clearrect-vs-setting-width/7
		var ctx = this._context,
			size = this._viewSize;
		ctx.clearRect(0, 0, size.width + 1, size.height + 1);
		project.draw(ctx, this._matrix, this._pixelRatio);
		project._needsUpdate = false;
		return true;
	}
},
new function() { // Item based mouse handling:
	var downPoint,
		lastPoint,
		overPoint,
		downItem,
		lastItem,
		overItem,
		dragItem,
		dblClick,
		clickTime;

	// Returns true if event was stopped, false otherwise, whether handler was
	// called or not!
	function callEvent(view, type, event, point, target, lastPoint) {
		var item = target,
			mouseEvent;

		function call(obj) {
			if (obj.responds(type)) {
				// Only produce the event object if we really need it, and then
				// reuse it if we're bubbling.
				if (!mouseEvent) {
					mouseEvent = new MouseEvent(type, event, point, target,
							// Calculate delta if lastPoint was passed
							lastPoint ? point.subtract(lastPoint) : null);
				}
				if (obj.emit(type, mouseEvent) && mouseEvent.isStopped) {
					// Call preventDefault() on native event if mouse event was
					// handled here.
					event.preventDefault();
					return true;
				}
			}
		}

		// Bubble up the DOM and find a parent that responds to this event.
		while (item) {
			if (call(item))
				return true;
			item = item.getParent();
		}
		// Also call event handler on view, if installed.
		if (call(view))
			return true;
		return false;
	}

	return /** @lends CanvasView# */{
		/**
		 * Returns true if event was stopped, false otherwise, whether handler
		 * was called or not!
		 */
		_handleEvent: function(type, point, event) {
			// Drop out if we don't have any event handlers for this type
			if (!this._eventCounters[type])
				return;
			// Run the hit-test first
			var project = this._project,
				hit = project.hitTest(point, {
					tolerance: 0,
					fill: true,
					stroke: true
				}),
				item = hit && hit.item,
				stopped = false;
			// Now handle the mouse events
			switch (type) {
			case 'mousedown':
				stopped = callEvent(this, type, event, point, item);
				// See if we're clicking again on the same item, within the
				// double-click time. Firefox uses 300ms as the max time
				// difference:
				dblClick = lastItem == item && (Date.now() - clickTime < 300);
				downItem = lastItem = item;
				downPoint = lastPoint = overPoint = point;
				// Only start dragging if none of the mosedown events have
				// stopped propagation.
				dragItem = !stopped && item;
				// Find the first item pu the chain that responds to drag.
				// NOTE: Drag event don't bubble
				while (dragItem && !dragItem.responds('mousedrag'))
					dragItem = dragItem._parent;
				break;
			case 'mouseup':
				// stopping mousup events does not prevent mousedrag / mousemove
				// hanlding here, but it does click / doubleclick
				stopped = callEvent(this, type, event, point, item, downPoint);
				if (dragItem) {
					// If the point has changed since the last mousedrag event,
					// send another one
					if (lastPoint && !lastPoint.equals(point))
						callEvent(this, 'mousedrag', event, point, dragItem,
								lastPoint);
					// If we end up over another item, send it a mousemove event
					// now. Use point as overPoint, so delta is (0, 0) since
					// this will be the first mousemove event for this item.
					if (item !== dragItem) {
						overPoint = point;
						callEvent(this, 'mousemove', event, point, item,
								overPoint);
					}
				}
				if (!stopped && item && item === downItem) {
					clickTime = Date.now();
					callEvent(this, dblClick && downItem.responds('doubleclick')
							? 'doubleclick' : 'click', event, downPoint, item);
					dblClick = false;
				}
				downItem = dragItem = null;
				break;
			case 'mousemove':
				// Allow both mousedrag and mousemove events to stop mousemove
				// events from reaching tools.
				if (dragItem)
					stopped = callEvent(this, 'mousedrag', event, point,
							dragItem, lastPoint);
				// TODO: Consider implementing this again? "If we have a
				// mousedrag event, do not send mousemove events to any
				// item while we're dragging."
				// For now, we let other items receive mousemove events even
				// during a drag event.
				// If we change the overItem, reset overPoint to point so
				// delta is (0, 0)
				if (!stopped) {
					if (item !== overItem)
						overPoint = point;
					stopped = callEvent(this, type, event, point, item,
							overPoint);
				}
				lastPoint = overPoint = point;
				if (item !== overItem) {
					callEvent(this, 'mouseleave', event, point, overItem);
					overItem = item;
					callEvent(this, 'mouseenter', event, point, item);
				}
				break;
			}
			return stopped;
		}
	};
});

// Node.js based image exporting code.
CanvasView.inject(new function() {
	// Utility function that converts a number to a string with
	// x amount of padded 0 digits:
	function toPaddedString(number, length) {
		var str = number.toString(10);
		for (var i = 0, l = length - str.length; i < l; i++) {
			str = '0' + str;
		}
		return str;
	}

	var fs = require('fs');

	return {
		// DOCS: CanvasView#exportFrames(param);
		exportFrames: function(param) {
			param = new Base({
				fps: 30,
				prefix: 'frame-',
				amount: 1
			}, param);
			if (!param.directory) {
				throw new Error('Missing param.directory');
			}
			var view = this,
				count = 0,
				frameDuration = 1 / param.fps,
				startTime = Date.now(),
				lastTime = startTime;

			// Start exporting frames by exporting the first frame:
			exportFrame(param);

			function exportFrame(param) {
				var filename = param.prefix + toPaddedString(count, 6) + '.png',
					path = param.directory + '/' + filename;
				var out = view.exportImage(path, function() {
					// When the file has been closed, export the next fame:
					var then = Date.now();
					if (param.onProgress) {
						param.onProgress({
							count: count,
							amount: param.amount,
							percentage: Math.round(count / param.amount
									* 10000) / 100,
							time: then - startTime,
							delta: then - lastTime
						});
					}
					lastTime = then;
					if (count < param.amount) {
						exportFrame(param);
					} else {
						// Call onComplete handler when finished:
						if (param.onComplete) {
							param.onComplete();
						}
					}
				});
				// Use new Base() to convert into a Base object, for #toString()
				view.emit('frame', new Base({
					delta: frameDuration,
					time: frameDuration * count,
					count: count
				}));
				count++;
			}
		},

		// DOCS: CanvasView#exportImage(path, callback);
		exportImage: function(path, callback) {
			this.draw();
			var out = fs.createWriteStream(path),
				stream = this._element.createPNGStream();
			// Pipe the png stream to the write stream:
			stream.pipe(out);
			if (callback) {
				out.on('close', callback);
			}
			return out;
		}
	};
});



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

// TODO: Run through the canvas array to find a canvas with the requested
// width / height, so we don't need to resize it?
var CanvasProvider = {
	canvases: [],

	getCanvas: function(width, height) {
		var canvas,
			clear = true;
		if (typeof width === 'object') {
			height = width.height;
			width = width.width;
		}
		if (this.canvases.length) {
			canvas = this.canvases.pop();
		} else {
			canvas = new Canvas(width, height);
			clear = false; // It's already cleared through constructor.
		}
		var ctx = canvas.getContext('2d');
		// If they are not the same size, we don't need to clear them
		// using clearRect and visa versa.
		if (canvas.width === width && canvas.height === height) {
			// +1 is needed on some browsers to really clear the borders
			if (clear)
				ctx.clearRect(0, 0, width + 1, height + 1);
		} else {
			canvas.width = width;
			canvas.height = height;
		}
		// We save on retrieval and restore on release.
		ctx.save();
		return canvas;
	},

	getContext: function(width, height) {
		return this.getCanvas(width, height).getContext('2d');
	},

	 // release can receive either a canvas or a context.
	release: function(obj) {
		var canvas = obj.canvas ? obj.canvas : obj;
		// We restore contexts on release(), see getCanvas()
		canvas.getContext('2d').restore();
		this.canvases.push(canvas);
	}
};

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

var BlendMode = new function() {
	var min = Math.min,
		max = Math.max,
		abs = Math.abs,
		sr, sg, sb, sa, // source
		br, bg, bb, ba, // backdrop
		dr, dg, db;		// destination

	// Conversion methods for HSL modes, as described by
	// http://www.aiim.org/documents/standards/pdf/blend_modes.pdf
	// The setters modify the variables dr, dg, db directly.

	function getLum(r, g, b) {
		return 0.2989 * r + 0.587 * g + 0.114 * b;
	}

	function setLum(r, g, b, l) {
		var d = l - getLum(r, g, b);
		dr = r + d;
		dg = g + d;
		db = b + d;
		var l = getLum(dr, dg, db),
			mn = min(dr, dg, db),
			mx = max(dr, dg, db);
		if (mn < 0) {
			var lmn = l - mn;
			dr = l + (dr - l) * l / lmn;
			dg = l + (dg - l) * l / lmn;
			db = l + (db - l) * l / lmn;
		}
		if (mx > 255) {
			var ln = 255 - l,
				mxl = mx - l;
			dr = l + (dr - l) * ln / mxl;
			dg = l + (dg - l) * ln / mxl;
			db = l + (db - l) * ln / mxl;
		}
	}

	function getSat(r, g, b) {
		return max(r, g, b) - min(r, g, b);
	}

	function setSat(r, g, b, s) {
		var col = [r, g, b],
			mx = max(r, g, b), // max
			mn = min(r, g, b), // min
			md; // mid
		// Determine indices for min and max in col:
		mn = mn === r ? 0 : mn === g ? 1 : 2;
		mx = mx === r ? 0 : mx === g ? 1 : 2;
		// Determine the index in col that is not used yet by min and max,
		// and assign it to mid:
		md = min(mn, mx) === 0 ? max(mn, mx) === 1 ? 2 : 1 : 0;
		// Now perform the actual algorithm
		if (col[mx] > col[mn]) {
			col[md] = (col[md] - col[mn]) * s / (col[mx] - col[mn]);
			col[mx] = s;
		} else {
			col[md] = col[mx] = 0;
		}
		col[mn] = 0;
		// Finally write out the values
		dr = col[0];
		dg = col[1];
		db = col[2];
	}

	var modes = {
		// B(Cb, Cs) = Cb x Cs
		multiply: function() {
			dr = br * sr / 255;
			dg = bg * sg / 255;
			db = bb * sb / 255;
		},

		// B(Cb, Cs) = 1 - [(1 - Cb) x (1 - Cs)] = Cb + Cs -(Cb x Cs)
		screen: function() {
			dr = br + sr - (br * sr / 255);
			dg = bg + sg - (bg * sg / 255);
			db = bb + sb - (bb * sb / 255);
		},

		// B(Cb, Cs) = HardLight(Cs, Cb)
		overlay: function() {
			// = Reverse of hard-light
			dr = br < 128 ? 2 * br * sr / 255 : 255 - 2 * (255 - br) * (255 - sr) / 255;
			dg = bg < 128 ? 2 * bg * sg / 255 : 255 - 2 * (255 - bg) * (255 - sg) / 255;
			db = bb < 128 ? 2 * bb * sb / 255 : 255 - 2 * (255 - bb) * (255 - sb) / 255;
		},

		'soft-light': function() {
			var t = sr * br / 255;
			dr = t + br * (255 - (255 - br) * (255 - sr) / 255 - t) / 255;
			t = sg * bg / 255;
			dg = t + bg * (255 - (255 - bg) * (255 - sg) / 255 - t) / 255;
			t = sb * bb / 255;
			db = t + bb * (255 - (255 - bb) * (255 - sb) / 255 - t) / 255;
		},

		// if (Cs <= 0.5) B(Cb, Cs) = Multiply(Cb, 2 x Cs)
		// else B(Cb, Cs) = Screen(Cb, 2 x Cs -1)
		'hard-light': function() {
			dr = sr < 128 ? 2 * sr * br / 255 : 255 - 2 * (255 - sr) * (255 - br) / 255;
			dg = sg < 128 ? 2 * sg * bg / 255 : 255 - 2 * (255 - sg) * (255 - bg) / 255;
			db = sb < 128 ? 2 * sb * bb / 255 : 255 - 2 * (255 - sb) * (255 - bb) / 255;
		},

		// if (Cb == 0) B(Cb, Cs) = 0
		// else if (Cs == 1) B(Cb, Cs) = 1
		// else B(Cb, Cs) = min(1, Cb / (1 - Cs))
		'color-dodge': function() {
			dr = br === 0 ? 0 : sr === 255 ? 255 : min(255, 255 * br / (255 - sr));
			dg = bg === 0 ? 0 : sg === 255 ? 255 : min(255, 255 * bg / (255 - sg));
			db = bb === 0 ? 0 : sb === 255 ? 255 : min(255, 255 * bb / (255 - sb));
		},

		// if (Cb == 1) B(Cb, Cs) = 1
		// else if (Cs == 0) B(Cb, Cs) = 0
		// else B(Cb, Cs) = 1 - min(1, (1 - Cb) / Cs)
		'color-burn': function() {
			dr = br === 255 ? 255 : sr === 0 ? 0 : max(0, 255 - (255 - br) * 255 / sr);
			dg = bg === 255 ? 255 : sg === 0 ? 0 : max(0, 255 - (255 - bg) * 255 / sg);
			db = bb === 255 ? 255 : sb === 0 ? 0 : max(0, 255 - (255 - bb) * 255 / sb);
		},

		//	B(Cb, Cs) = min(Cb, Cs)
		darken: function() {
			dr = br < sr ? br : sr;
			dg = bg < sg ? bg : sg;
			db = bb < sb ? bb : sb;
		},

		// B(Cb, Cs) = max(Cb, Cs)
		lighten: function() {
			dr = br > sr ? br : sr;
			dg = bg > sg ? bg : sg;
			db = bb > sb ? bb : sb;
		},

		// B(Cb, Cs) = | Cb - Cs |
		difference: function() {
			dr = br - sr;
			if (dr < 0)
				dr = -dr;
			dg = bg - sg;
			if (dg < 0)
				dg = -dg;
			db = bb - sb;
			if (db < 0)
				db = -db;
		},

		//	B(Cb, Cs) = Cb + Cs - 2 x Cb x Cs
		exclusion: function() {
			dr = br + sr * (255 - br - br) / 255;
			dg = bg + sg * (255 - bg - bg) / 255;
			db = bb + sb * (255 - bb - bb) / 255;
		},

		// HSL Modes:
		hue: function() {
			setSat(sr, sg, sb, getSat(br, bg, bb));
			setLum(dr, dg, db, getLum(br, bg, bb));
		},

		saturation: function() {
			setSat(br, bg, bb, getSat(sr, sg, sb));
			setLum(dr, dg, db, getLum(br, bg, bb));
		},

		luminosity: function() {
			setLum(br, bg, bb, getLum(sr, sg, sb));
		},

		color: function() {
			setLum(sr, sg, sb, getLum(br, bg, bb));
		},

		// TODO: Not in Illustrator:
		add: function() {
			dr = min(br + sr, 255);
			dg = min(bg + sg, 255);
			db = min(bb + sb, 255);
		},

		subtract: function() {
			dr = max(br - sr, 0);
			dg = max(bg - sg, 0);
			db = max(bb - sb, 0);
		},

		average: function() {
			dr = (br + sr) / 2;
			dg = (bg + sg) / 2;
			db = (bb + sb) / 2;
		},

		negation: function() {
			dr = 255 - abs(255 - sr - br);
			dg = 255 - abs(255 - sg - bg);
			db = 255 - abs(255 - sb - bb);
		}
	};

	// Build a lookup table for natively supported CSS composite- & blend-modes.
	// The canvas composite modes are always natively supported:
	var nativeModes = this.nativeModes = Base.each([
		'source-over', 'source-in', 'source-out', 'source-atop',
		'destination-over', 'destination-in', 'destination-out',
		'destination-atop', 'lighter', 'darker', 'copy', 'xor'
	], function(mode) {
		this[mode] = true;
	}, {});

	// Now test for the new blend modes. Just seeing if globalCompositeOperation
	// is sticky is not enough, as Chome 27 pretends for blend-modes to work,
	// but does not actually apply them.
	var ctx = CanvasProvider.getContext(1, 1);
	Base.each(modes, function(func, mode) {
		// Blend #330000 (51) and #aa0000 (170):
		// Multiplying should lead to #220000 (34)
		// For darken we need to reverse color parameters in order to test mode.
		var darken = mode === 'darken',
			ok = false;
		ctx.save();
		// FF 3.6 throws exception when setting globalCompositeOperation to
		// unsupported values.
		try {
			ctx.fillStyle = darken ? '#300' : '#a00';
			ctx.fillRect(0, 0, 1, 1);
			ctx.globalCompositeOperation = mode;
			if (ctx.globalCompositeOperation === mode) {
				ctx.fillStyle = darken ? '#a00' : '#300';
				ctx.fillRect(0, 0, 1, 1);
				ok = ctx.getImageData(0, 0, 1, 1).data[0] !== darken ? 170 : 51;
			}
		} catch (e) {}
		ctx.restore();
		nativeModes[mode] = ok;
	});
	CanvasProvider.release(ctx);

	this.process = function(mode, srcContext, dstContext, alpha, offset) {
		var srcCanvas = srcContext.canvas,
			normal = mode === 'normal';
		// Use native blend-modes if supported, and fall back to emulation.
		if (normal || nativeModes[mode]) {
			dstContext.save();
			// Reset transformations, since we're blitting and pixel scale and
			// with a given offset.
			dstContext.setTransform(1, 0, 0, 1, 0, 0);
			dstContext.globalAlpha = alpha;
			if (!normal)
				dstContext.globalCompositeOperation = mode;
			dstContext.drawImage(srcCanvas, offset.x, offset.y);
			dstContext.restore();
		} else {
			var process = modes[mode];
			if (!process)
				return;
			var dstData = dstContext.getImageData(offset.x, offset.y,
					srcCanvas.width, srcCanvas.height),
				dst = dstData.data,
				src = srcContext.getImageData(0, 0,
					srcCanvas.width, srcCanvas.height).data;
			for (var i = 0, l = dst.length; i < l; i += 4) {
				sr = src[i];
				br = dst[i];
				sg = src[i + 1];
				bg = dst[i + 1];
				sb = src[i + 2];
				bb = dst[i + 2];
				sa = src[i + 3];
				ba = dst[i + 3];
				process();
				var a1 = sa * alpha / 255,
					a2 = 1 - a1;
				dst[i] = a1 * dr + a2 * br;
				dst[i + 1] = a1 * dg + a2 * bg;
				dst[i + 2] = a1 * db + a2 * bb;
				dst[i + 3] = sa * alpha + a2 * ba;
			}
			dstContext.putImageData(dstData, offset.x, offset.y);
		}
	};
};


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

var SVGStyles = Base.each({
	// Fill
	fillColor: ['fill', 'color'],
	// Stroke
	strokeColor: ['stroke', 'color'],
	strokeWidth: ['stroke-width', 'number'],
	strokeCap: ['stroke-linecap', 'string'],
	strokeJoin: ['stroke-linejoin', 'string'],
	strokeScaling: ['vector-effect', 'lookup', {
		true: 'none',
		false: 'non-scaling-stroke'
	}, function(item, value) {
		// no inheritance, only applies to graphical elements
		return !value // false, meaning non-scaling-stroke
				&& (item instanceof PathItem
					|| item instanceof Shape
					|| item instanceof TextItem);
	}],
	miterLimit: ['stroke-miterlimit', 'number'],
	dashArray: ['stroke-dasharray', 'array'],
	dashOffset: ['stroke-dashoffset', 'number'],
	// Text
	fontFamily: ['font-family', 'string'],
	fontWeight: ['font-weight', 'string'],
	fontSize: ['font-size', 'number'],
	justification: ['text-anchor', 'lookup', {
		left: 'start',
		center: 'middle',
		right: 'end'
	}],
	// Item
	opacity: ['opacity', 'number'],
	blendMode: ['mix-blend-mode', 'string']
}, function(entry, key) {
	var part = Base.capitalize(key),
		lookup = entry[2];
	this[key] = {
		type: entry[1],
		property: key,
		attribute: entry[0],
		toSVG: lookup,
		fromSVG: lookup && Base.each(lookup, function(value, name) {
			this[value] = name;
		}, {}),
		exportFilter: entry[3],
		get: 'get' + part,
		set: 'set' + part
	};
}, {});

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

var SVGNamespaces = {
	href: 'http://www.w3.org/1999/xlink',
	xlink: 'http://www.w3.org/2000/xmlns'
};

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
 * A function scope holding all the functionality needed to convert a
 * Paper.js DOM to a SVG DOM.
 */
new function() {
	// TODO: Consider moving formatter into options object, and pass it along.
	var formatter;

	function setAttributes(node, attrs) {
		for (var key in attrs) {
			var val = attrs[key],
				namespace = SVGNamespaces[key];
			if (typeof val === 'number')
				val = formatter.number(val);
			if (namespace) {
				node.setAttributeNS(namespace, key, val);
			} else {
				node.setAttribute(key, val);
			}
		}
		return node;
	}

	function createElement(tag, attrs) {
		return setAttributes(
			document.createElementNS('http://www.w3.org/2000/svg', tag), attrs);
	}

	function getTransform(matrix, coordinates, center) {
		// Use new Base() so we can use Base#set() on it.
		var attrs = new Base(),
			trans = matrix.getTranslation();
		if (coordinates) {
			// If the item suppports x- and y- coordinates, we're taking out the
			// translation part of the matrix and move it to x, y attributes, to
			// produce more readable markup, and not have to use center points
			// in rotate(). To do so, SVG requries us to inverse transform the
			// translation point by the matrix itself, since they are provided
			// in local coordinates.
			matrix = matrix.shiftless();
			var point = matrix._inverseTransform(trans);
			attrs[center ? 'cx' : 'x'] = point.x;
			attrs[center ? 'cy' : 'y'] = point.y;
			trans = null;
		}
		if (!matrix.isIdentity()) {
			// See if we can decompose the matrix and can formulate it as a
			// simple translate/scale/rotate command sequence.
			var decomposed = matrix.decompose();
			if (decomposed && !decomposed.shearing) {
				var parts = [],
					angle = decomposed.rotation,
					scale = decomposed.scaling;
				if (trans && !trans.isZero())
					parts.push('translate(' + formatter.point(trans) + ')');
				if (!Numerical.isZero(scale.x - 1)
						|| !Numerical.isZero(scale.y - 1))
					parts.push('scale(' + formatter.point(scale) +')');
				if (angle)
					parts.push('rotate(' + formatter.number(angle) + ')');
				attrs.transform = parts.join(' ');
			} else {
				attrs.transform = 'matrix(' + matrix.getValues().join(',') + ')';
			}
		}
		return attrs;
	}

	function exportGroup(item, options) {
		var attrs = getTransform(item._matrix),
			children = item._children;
		var node = createElement('g', attrs);
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i];
			var childNode = exportSVG(child, options);
			if (childNode) {
				if (child.isClipMask()) {
					var clip = createElement('clipPath');
					clip.appendChild(childNode);
					setDefinition(child, clip, 'clip');
					setAttributes(node, {
						'clip-path': 'url(#' + clip.id + ')'
					});
				} else {
					node.appendChild(childNode);
				}
			}
		}
		return node;
	}

	function exportRaster(item, options) {
		var attrs = getTransform(item._matrix, true),
			size = item.getSize(),
			image = item.getImage();
		// Take into account that rasters are centered:
		attrs.x -= size.width / 2;
		attrs.y -= size.height / 2;
		attrs.width = size.width;
		attrs.height = size.height;
		attrs.href = options.embedImages === false && image && image.src
				|| item.toDataURL();
		return createElement('image', attrs);
	}

	function exportPath(item, options) {
		var matchShapes = options.matchShapes;
		if (matchShapes) {
			var shape = item.toShape(false);
			if (shape)
				return exportShape(shape, options);
		}
		var segments = item._segments,
			type,
			attrs = getTransform(item._matrix);
		if (segments.length === 0)
			return null;
		if (matchShapes && !item.hasHandles()) {
			if (segments.length >= 3) {
				type = item._closed ? 'polygon' : 'polyline';
				var parts = [];
				for(var i = 0, l = segments.length; i < l; i++)
					parts.push(formatter.point(segments[i]._point));
				attrs.points = parts.join(' ');
			} else {
				type = 'line';
				var first = segments[0]._point,
					last = segments[segments.length - 1]._point;
				attrs.set({
					x1: first.x,
					y1: first.y,
					x2: last.x,
					y2: last.y
				});
			}
		} else {
			type = 'path';
			attrs.d = item.getPathData(null, options.precision);
		}
		return createElement(type, attrs);
	}

	function exportShape(item) {
		var type = item._type,
			radius = item._radius,
			attrs = getTransform(item._matrix, true, type !== 'rectangle');
		if (type === 'rectangle') {
			type = 'rect'; // SVG
			var size = item._size,
				width = size.width,
				height = size.height;
			attrs.x -= width / 2;
			attrs.y -= height / 2;
			attrs.width = width;
			attrs.height = height;
			if (radius.isZero())
				radius = null;
		}
		if (radius) {
			if (type === 'circle') {
				attrs.r = radius;
			} else {
				attrs.rx = radius.width;
				attrs.ry = radius.height;
			}
		}
		return createElement(type, attrs);
	}

	function exportCompoundPath(item, options) {
		var attrs = getTransform(item._matrix);
		var data = item.getPathData(null, options.precision);
		if (data)
			attrs.d = data;
		return createElement('path', attrs);
	}

	function exportPlacedSymbol(item, options) {
		var attrs = getTransform(item._matrix, true),
			symbol = item.getSymbol(),
			symbolNode = getDefinition(symbol, 'symbol'),
			definition = symbol.getDefinition(),
			bounds = definition.getBounds();
		if (!symbolNode) {
			symbolNode = createElement('symbol', {
				viewBox: formatter.rectangle(bounds)
			});
			symbolNode.appendChild(exportSVG(definition, options));
			setDefinition(symbol, symbolNode, 'symbol');
		}
		attrs.href = '#' + symbolNode.id;
		attrs.x += bounds.x;
		attrs.y += bounds.y;
		attrs.width = formatter.number(bounds.width);
		attrs.height = formatter.number(bounds.height);
		attrs.overflow = 'visible';
		return createElement('use', attrs);
	}

	function exportGradient(color) {
		// NOTE: As long as the fillTransform attribute is not implemented,
		// we need to create a separate gradient object for each gradient,
		// even when they share the same gradient defintion.
		// http://www.svgopen.org/2011/papers/20-Separating_gradients_from_geometry/
		// TODO: Implement gradient merging in SVGImport
		var gradientNode = getDefinition(color, 'color');
		if (!gradientNode) {
			var gradient = color.getGradient(),
				radial = gradient._radial,
				origin = color.getOrigin().transform(),
				destination = color.getDestination().transform(),
				attrs;
			if (radial) {
				attrs = {
					cx: origin.x,
					cy: origin.y,
					r: origin.getDistance(destination)
				};
				var highlight = color.getHighlight();
				if (highlight) {
					highlight = highlight.transform();
					attrs.fx = highlight.x;
					attrs.fy = highlight.y;
				}
			} else {
				attrs = {
					x1: origin.x,
					y1: origin.y,
					x2: destination.x,
					y2: destination.y
				};
			}
			attrs.gradientUnits = 'userSpaceOnUse';
			gradientNode = createElement(
					(radial ? 'radial' : 'linear') + 'Gradient', attrs);
			var stops = gradient._stops;
			for (var i = 0, l = stops.length; i < l; i++) {
				var stop = stops[i],
					stopColor = stop._color,
					alpha = stopColor.getAlpha();
				attrs = {
					offset: stop._rampPoint,
					'stop-color': stopColor.toCSS(true)
				};
				// See applyStyle for an explanation of why there are separated
				// opacity / color attributes.
				if (alpha < 1)
					attrs['stop-opacity'] = alpha;
				gradientNode.appendChild(createElement('stop', attrs));
			}
			setDefinition(color, gradientNode, 'color');
		}
		return 'url(#' + gradientNode.id + ')';
	}

	function exportText(item) {
		var node = createElement('text', getTransform(item._matrix, true));
		node.textContent = item._content;
		return node;
	}

	var exporters = {
		Group: exportGroup,
		Layer: exportGroup,
		Raster: exportRaster,
		Path: exportPath,
		Shape: exportShape,
		CompoundPath: exportCompoundPath,
		PlacedSymbol: exportPlacedSymbol,
		PointText: exportText
	};

	function applyStyle(item, node, isRoot) {
		var attrs = {},
			parent = !isRoot && item.getParent();

		if (item._name != null)
			attrs.id = item._name;

		Base.each(SVGStyles, function(entry) {
			// Get a given style only if it differs from the value on the parent
			// (A layer or group which can have style values in SVG).
			var get = entry.get,
				type = entry.type,
				value = item[get]();
			if (entry.exportFilter
					? entry.exportFilter(item, value)
					: !parent || !Base.equals(parent[get](), value)) {
				if (type === 'color' && value != null) {
					// Support for css-style rgba() values is not in SVG 1.1, so
					// separate the alpha value of colors with alpha into the
					// separate fill- / stroke-opacity attribute:
					var alpha = value.getAlpha();
					if (alpha < 1)
						attrs[entry.attribute + '-opacity'] = alpha;
				}
				attrs[entry.attribute] = value == null
					? 'none'
					: type === 'number'
						? formatter.number(value)
						: type === 'color'
							? value.gradient
								? exportGradient(value, item)
								// true for noAlpha, see above
								: value.toCSS(true)
							: type === 'array'
								? value.join(',')
								: type === 'lookup'
									? entry.toSVG[value]
									: value;
			}
		});

		if (attrs.opacity === 1)
			delete attrs.opacity;

		if (!item._visible)
			attrs.visibility = 'hidden';

		return setAttributes(node, attrs);
	}

	var definitions;
	function getDefinition(item, type) {
		if (!definitions)
			definitions = { ids: {}, svgs: {} };
		return item && definitions.svgs[type + '-' + item._id];
	}

	function setDefinition(item, node, type) {
		// Make sure the definitions lookup is created before we use it.
		// This is required by 'clip', where getDefinition() is not called.
		if (!definitions)
			getDefinition();
		// Have different id ranges per type
		var id = definitions.ids[type] = (definitions.ids[type] || 0) + 1;
		// Give the svg node an id, and link to it from the item id.
		node.id = type + '-' + id;
		definitions.svgs[type + '-' + item._id] = node;
	}

	function exportDefinitions(node, options) {
		var svg = node,
			defs = null;
		if (definitions) {
			// We can only use svg nodes as defintion containers. Have the loop
			// produce one if it's a single item of another type (when calling
			// #exportSVG() on an item rather than a whole project)
			// jsdom in Node.js uses uppercase values for nodeName...
			svg = node.nodeName.toLowerCase() === 'svg' && node;
			for (var i in definitions.svgs) {
				// This code is inside the loop so we only create a container if
				// we actually have svgs.
				if (!defs) {
					if (!svg) {
						svg = createElement('svg');
						svg.appendChild(node);
					}
					defs = svg.insertBefore(createElement('defs'),
							svg.firstChild);
				}
				defs.appendChild(definitions.svgs[i]);
			}
			// Clear definitions at the end of export
			definitions = null;
		}
		return options.asString
				? new XMLSerializer().serializeToString(svg)
				: svg;
	}

	function exportSVG(item, options, isRoot) {
		var exporter = exporters[item._class],
			node = exporter && exporter(item, options);
		if (node) {
			// Support onExportItem callback, to provide mechanism to handle
			// special attributes (e.g. inkscape:transform-center)
			var onExport = options.onExport;
			if (onExport)
				node = onExport(item, node, options) || node;
			var data = JSON.stringify(item._data);
			if (data && data !== '{}' && data !== 'null')
				node.setAttribute('data-paper-data', data);
		}
		return node && applyStyle(item, node, isRoot);
	}

	function setOptions(options) {
		if (!options)
			options = {};
		formatter = new Formatter(options.precision);
		return options;
	}

	Item.inject({
		exportSVG: function(options) {
			options = setOptions(options);
			return exportDefinitions(exportSVG(this, options, true), options);
		}
	});

	Project.inject({
		exportSVG: function(options) {
			options = setOptions(options);
			var layers = this.layers,
				view = this.getView(),
				size = view.getViewSize(),
				node = createElement('svg', {
					x: 0,
					y: 0,
					width: size.width,
					height: size.height,
					version: '1.1',
					xmlns: 'http://www.w3.org/2000/svg',
					'xmlns:xlink': 'http://www.w3.org/1999/xlink'
				}),
				parent = node,
				matrix = view._matrix;
			// If the view has a transformation, wrap all layers in a group with
			// that transformation applied to.
			if (!matrix.isIdentity())
				parent = node.appendChild(
						createElement('g', getTransform(matrix)));
			for (var i = 0, l = layers.length; i < l; i++)
				parent.appendChild(exportSVG(layers[i], options, true));
			return exportDefinitions(node, options);
		}
	});
};

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
 * A function scope holding all the functionality needed to convert a SVG DOM
 * to a Paper.js DOM.
 */
new function() {
	// Define a couple of helper functions to easily read values from SVG
	// objects, dealing with baseVal, and item lists.
	// index is option, and if passed, causes a lookup in a list.

	function getValue(node, name, isString, allowNull) {
		var namespace = SVGNamespaces[name],
			value = namespace
				? node.getAttributeNS(namespace, name)
				: node.getAttribute(name);
		if (value === 'null')
			value = null;
		// Interpret value as number. Never return NaN, but 0 instead.
		// If the value is a sequence of numbers, parseFloat will
		// return the first occurring number, which is enough for now.
		return value == null
				? allowNull
					? null
					: isString
						? ''
						: 0
				: isString
					? value
					: parseFloat(value);
	}

	function getPoint(node, x, y, allowNull) {
		x = getValue(node, x, false, allowNull);
		y = getValue(node, y, false, allowNull);
		return allowNull && (x == null || y == null) ? null
				: new Point(x, y);
	}

	function getSize(node, w, h, allowNull) {
		w = getValue(node, w, false, allowNull);
		h = getValue(node, h, false, allowNull);
		return allowNull && (w == null || h == null) ? null
				: new Size(w, h);
	}

	// Converts a string attribute value to the specified type
	function convertValue(value, type, lookup) {
		return value === 'none'
				? null
				: type === 'number'
					? parseFloat(value)
					: type === 'array'
						? value ? value.split(/[\s,]+/g).map(parseFloat) : []
						: type === 'color'
							? getDefinition(value) || value
							: type === 'lookup'
								? lookup[value]
								: value;
	}

	// Importer functions for various SVG node types

	function importGroup(node, type, options, isRoot) {
		var nodes = node.childNodes,
			isClip = type === 'clippath',
			item = new Group(),
			project = item._project,
			currentStyle = project._currentStyle,
			children = [];
		if (!isClip) {
			item = applyAttributes(item, node, isRoot);
			// Style on items needs to be handled differently than all other
			// items: We first apply the style to the item, then use it as the
			// project's currentStyle, so it is used as a default for the
			// creation of all nested items. importSVG then needs to check for
			// items and avoid calling applyAttributes() again.
			project._currentStyle = item._style.clone();
		}
		if (isRoot) {
			// Import all defs first, since in SVG they can be in any location.
			// e.g. Affinity Designer exports defs as last.
			var defs = node.querySelectorAll('defs');
			for (var i = 0, l = defs.length; i < l; i++) {
				importSVG(defs[i], options, false);
			}
		}
		// Collect the children in an array and apply them all at once.
		for (var i = 0, l = nodes.length; i < l; i++) {
			var childNode = nodes[i],
				child;
			if (childNode.nodeType === 1
					&& childNode.nodeName.toLowerCase() !== 'defs'
					&& (child = importSVG(childNode, options, false))
					&& !(child instanceof Symbol))
				children.push(child);
		}
		item.addChildren(children);
		// Clip paths are reduced (unboxed) and their attributes applied at the
		// end.
		if (isClip)
			item = applyAttributes(item.reduce(), node, isRoot);
		// Restore currentStyle
		project._currentStyle = currentStyle;
		if (isClip || type === 'defs') {
			// We don't want the defs in the DOM. But we might want to use
			// Symbols for them to save memory?
			item.remove();
			item = null;
		}
		return item;
	}

	function importPoly(node, type) {
		var coords = node.getAttribute('points').match(
					/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g),
			points = [];
		for (var i = 0, l = coords.length; i < l; i += 2)
			points.push(new Point(
					parseFloat(coords[i]),
					parseFloat(coords[i + 1])));
		var path = new Path(points);
		if (type === 'polygon')
			path.closePath();
		return path;
	}

	function importPath(node) {
		// Get the path data, and determine whether it is a compound path or a
		// normal path based on the amount of moveTo commands inside it.
		var data = node.getAttribute('d'),
			param = { pathData: data };
		// If there are multiple moveTo commands or a closePath command followed
		// by other commands, we have a CompoundPath:
		return (data.match(/m/gi) || []).length > 1 || /z\S+/i.test(data)
				? new CompoundPath(param)
				: new Path(param);
	}

	function importGradient(node, type) {
		var id = (getValue(node, 'href', true) || '').substring(1),
			isRadial = type === 'radialgradient',
			gradient;
		if (id) {
			// Gradients are always wrapped in a Color object, so get the
			// gradient object from there.
			// TODO: Handle exception if there is no definition for this id.
			gradient = definitions[id].getGradient();
		} else {
			var nodes = node.childNodes,
				stops = [];
			for (var i = 0, l = nodes.length; i < l; i++) {
				var child = nodes[i];
				if (child.nodeType === 1)
					stops.push(applyAttributes(new GradientStop(), child));
			}
			gradient = new Gradient(stops, isRadial);
		}
		var origin, destination, highlight;
		if (isRadial) {
			origin = getPoint(node, 'cx', 'cy');
			destination = origin.add(getValue(node, 'r'), 0);
			highlight = getPoint(node, 'fx', 'fy', true);
		} else {
			origin = getPoint(node, 'x1', 'y1');
			destination = getPoint(node, 'x2', 'y2');
		}
		applyAttributes(
			new Color(gradient, origin, destination, highlight), node);
		// We don't return the gradient, since we only need a reference to it in
		// definitions, which is created in applyAttributes()
		return null;
	}

	// NOTE: All importers are lowercase, since jsdom is using uppercase
	// nodeNames still.
	var importers = {
		'#document': function (node, type, options, isRoot) {
			var nodes = node.childNodes;
			for (var i = 0, l = nodes.length; i < l; i++) {
				var child = nodes[i];
				if (child.nodeType === 1) {
					// NOTE: We need to move the svg node into our current
					// document, so default styles apply!
					var next = child.nextSibling;
					document.body.appendChild(child);
					var item = importSVG(child, options, isRoot);
					//	After import, we move it back to where it was:
					if (next) {
						node.insertBefore(child, next);
					} else {
						node.appendChild(child);
					}
					return item;
				}
			}
		},
		// http://www.w3.org/TR/SVG/struct.html#Groups
		g: importGroup,
		// http://www.w3.org/TR/SVG/struct.html#NewDocument
		svg: importGroup,
		clippath: importGroup,
		// http://www.w3.org/TR/SVG/shapes.html#PolygonElement
		polygon: importPoly,
		// http://www.w3.org/TR/SVG/shapes.html#PolylineElement
		polyline: importPoly,
		// http://www.w3.org/TR/SVG/paths.html
		path: importPath,
		// http://www.w3.org/TR/SVG/pservers.html#LinearGradients
		lineargradient: importGradient,
		// http://www.w3.org/TR/SVG/pservers.html#RadialGradients
		radialgradient: importGradient,

		// http://www.w3.org/TR/SVG/struct.html#ImageElement
		image: function (node) {
			var raster = new Raster(getValue(node, 'href', true));
			raster.on('load', function() {
				var size = getSize(node, 'width', 'height');
				this.setSize(size);
				// Since x and y start from the top left of an image, add
				// half of its size. We also need to take the raster's matrix
				// into account, which will be defined by the time the load
				// event is called.
				var center = this._matrix._transformPoint(
						getPoint(node, 'x', 'y').add(size.divide(2)));
				this.translate(center);
			});
			return raster;
		},

		// http://www.w3.org/TR/SVG/struct.html#SymbolElement
		symbol: function(node, type, options, isRoot) {
			// Pass true for dontCenter:
			return new Symbol(importGroup(node, type, options, isRoot), true);
		},

		// http://www.w3.org/TR/SVG/struct.html#DefsElement
		defs: importGroup,

		// http://www.w3.org/TR/SVG/struct.html#UseElement
		use: function(node) {
			// Note the namespaced xlink:href attribute is just called href
			// as a property on node.
			// TODO: Support overflow and width, height, in combination with
			// overflow: hidden. Paper.js currently does not support
			// PlacedSymbol clipping, but perhaps it should?
			var id = (getValue(node, 'href', true) || '').substring(1),
				definition = definitions[id],
				point = getPoint(node, 'x', 'y');
			// Use place if we're dealing with a symbol:
			return definition
					? definition instanceof Symbol
						// When placing symbols, we nee to take both point and
						// matrix into account. This just does the right thing:
						? definition.place(point)
						: definition.clone().translate(point)
					: null;
		},

		// http://www.w3.org/TR/SVG/shapes.html#InterfaceSVGCircleElement
		circle: function(node) {
			return new Shape.Circle(getPoint(node, 'cx', 'cy'),
					getValue(node, 'r'));
		},

		// http://www.w3.org/TR/SVG/shapes.html#InterfaceSVGEllipseElement
		ellipse: function(node) {
			// We only use object literal notation where the default one is not
			// supported (e.g. center / radius fo Shape.Ellipse).
			return new Shape.Ellipse({
				center: getPoint(node, 'cx', 'cy'),
				radius: getSize(node, 'rx', 'ry')
			});
		},

		// http://www.w3.org/TR/SVG/shapes.html#RectElement
		rect: function(node) {
			var point = getPoint(node, 'x', 'y'),
				size = getSize(node, 'width', 'height'),
				radius = getSize(node, 'rx', 'ry');
			return new Shape.Rectangle(new Rectangle(point, size), radius);
		},

		// http://www.w3.org/TR/SVG/shapes.html#LineElement
		line: function(node) {
			return new Path.Line(getPoint(node, 'x1', 'y1'),
					getPoint(node, 'x2', 'y2'));
		},

		text: function(node) {
			// Not supported by Paper.js
			// x: multiple values for x
			// y: multiple values for y
			// dx: multiple values for x
			// dy: multiple values for y
			// TODO: Support for these is missing in Paper.js right now
			// rotate: character rotation
			// lengthAdjust:
			var text = new PointText(getPoint(node, 'x', 'y')
					.add(getPoint(node, 'dx', 'dy')));
			text.setContent(node.textContent.trim() || '');
			return text;
		}
	};

	// Attributes and Styles

	// NOTE: Parameter sequence for all apply*() functions is:
	// (item, value, name, node) rather than (item, node, name, value),
	// so we can omit the less likely parameters from right to left.

	function applyTransform(item, value, name, node) {
		// http://www.w3.org/TR/SVG/types.html#DataTypeTransformList
		// Parse SVG transform string. First we split at /)\s*/, to separate
		// commands
		var transforms = (node.getAttribute(name) || '').split(/\)\s*/g),
			matrix = new Matrix();
		for (var i = 0, l = transforms.length; i < l; i++) {
			var transform = transforms[i];
			if (!transform)
				break;
			// Command come before the '(', values after
			var parts = transform.split(/\(\s*/),
				command = parts[0],
				v = parts[1].split(/[\s,]+/g);
			// Convert values to floats
			for (var j = 0, m = v.length; j < m; j++)
				v[j] = parseFloat(v[j]);
			switch (command) {
			case 'matrix':
				matrix.concatenate(
						new Matrix(v[0], v[1], v[2], v[3], v[4], v[5]));
				break;
			case 'rotate':
				matrix.rotate(v[0], v[1], v[2]);
				break;
			case 'translate':
				matrix.translate(v[0], v[1]);
				break;
			case 'scale':
				matrix.scale(v);
				break;
			case 'skewX':
				matrix.skew(v[0], 0);
				break;
			case 'skewY':
				matrix.skew(0, v[0]);
				break;
			}
		}
		item.transform(matrix);
	}

	function applyOpacity(item, value, name) {
		// http://www.w3.org/TR/SVG/painting.html#FillOpacityProperty
		// http://www.w3.org/TR/SVG/painting.html#StrokeOpacityProperty
		var color = item[name === 'fill-opacity' ? 'getFillColor'
				: 'getStrokeColor']();
		if (color)
			color.setAlpha(parseFloat(value));
	}

	// Create apply-functions for attributes, and merge in those for SVGStlyes.
	// We need to define style attributes first, and merge in all others after,
	// since transform needs to be applied after fill color, as transformations
	// can affect gradient fills.
	// Use Base.set() to control sequence of attributes and have all entries in
	// SVGStyles (e.g. 'stroke') before the additional attributes below (e.g.
	// 'stroke-opacity'). See issue #694.
	var attributes = Base.set(Base.each(SVGStyles, function(entry) {
		this[entry.attribute] = function(item, value) {
			item[entry.set](convertValue(value, entry.type, entry.fromSVG));
			// When applying gradient colors to shapes, we need to offset
			// the shape's initial position to get the same results as SVG.
			if (entry.type === 'color' && item instanceof Shape) {
				// Do not use result of convertValue() above, since calling
				// the setter will produce a new cloned color.
				var color = item[entry.get]();
				if (color)
					color.transform(new Matrix().translate(
							item.getPosition(true).negate()));
			}
		};
	}, {}), {
		id: function(item, value) {
			definitions[value] = item;
			if (item.setName)
				item.setName(value);
		},

		'clip-path': function(item, value) {
			// http://www.w3.org/TR/SVG/masking.html#ClipPathProperty
			var clip = getDefinition(value);
			if (clip) {
				clip = clip.clone();
				clip.setClipMask(true);
				// If item is already a group, move the clip-path inside
				if (item instanceof Group) {
					item.insertChild(0, clip);
				} else {
					return new Group(clip, item);
				}
			}
		},

		gradientTransform: applyTransform,
		transform: applyTransform,

		'fill-opacity': applyOpacity,
		'stroke-opacity': applyOpacity,

		visibility: function(item, value) {
			item.setVisible(value === 'visible');
		},

		display: function(item, value) {
			// NOTE: 'none' gets translated to null in getAttribute()
			item.setVisible(value !== null);
		},

		'stop-color': function(item, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopColorProperty
			if (item.setColor)
				item.setColor(value);
		},

		'stop-opacity': function(item, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopOpacityProperty
			// NOTE: It is important that this is applied after stop-color!
			if (item._color)
				item._color.setAlpha(parseFloat(value));
		},

		offset: function(item, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopElementOffsetAttribute
			var percentage = value.match(/(.*)%$/);
			item.setRampPoint(percentage
					? percentage[1] / 100
					: parseFloat(value));
		},

		viewBox: function(item, value, name, node, styles) {
			// http://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute
			// TODO: implement preserveAspectRatio attribute
			// viewBox will be applied both to the group that's created for the
			// content in Symbol.definition, and the Symbol itself.
			var rect = new Rectangle(convertValue(value, 'array')),
				size = getSize(node, 'width', 'height', true);
			if (item instanceof Group) {
				// This is either a top-level svg node, or the container for a
				// symbol.
				var scale = size ? rect.getSize().divide(size) : 1,
					matrix = new Matrix().translate(rect.getPoint()).scale(scale);
				item.transform(matrix.inverted());
			} else if (item instanceof Symbol) {
				// The symbol is wrapping a group. Note that viewBox was already
				// applied to the group, and above code was executed for it.
				// All that is left to handle here on the Symbol level is
				// clipping. We can't do it at group level because
				// applyAttributes() gets called for groups before their
				// children are added, for styling reasons. See importGroup()
				if (size)
					rect.setSize(size);
				var clip = getAttribute(node, 'overflow', styles) != 'visible',
					group = item._definition;
				if (clip && !rect.contains(group.getBounds())) {
					// Add a clip path at the top of this symbol's group
					clip = new Shape.Rectangle(rect).transform(group._matrix);
					clip.setClipMask(true);
					group.addChild(clip);
				}
			}
		}
	});

	function getAttribute(node, name, styles) {
		// First see if the given attribute is defined.
		var attr = node.attributes[name],
			value = attr && attr.value;
		if (!value) {
			// Fallback to using styles. See if there is a style, either set
			// directly on the object or applied to it through CSS rules.
			// We also need to filter out inheritance from their parents.
			var style = Base.camelize(name);
			value = node.style[style];
			if (!value && styles.node[style] !== styles.parent[style])
				value = styles.node[style];
		}
		// Return undefined if attribute is not defined, but null if it's
		// defined as not set (e.g. fill / stroke).
		return !value
				? undefined
				: value === 'none'
					? null
					: value;
	}

	/**
	 * Converts various SVG styles and attributes into Paper.js styles and
	 * attributes and applies them to the passed item.
	 *
	 * @param {SVGElement} node an SVG node to read style and attributes from
	 * @param {Item} item the item to apply the style and attributes to
	 */
	function applyAttributes(item, node, isRoot) {
		// SVG attributes can be set both as styles and direct node attributes,
		// so we need to handle both.
		var styles = {
			node: DomElement.getStyles(node) || {},
			// Do not check for inheritance if this is the root, since we want
			// the default SVG settings to stick.
			parent: !isRoot && DomElement.getStyles(node.parentNode) || {}
		};
		Base.each(attributes, function(apply, name) {
			var value = getAttribute(node, name, styles);
			if (value !== undefined)
				item = Base.pick(apply(item, value, name, node, styles), item);
		});
		return item;
	}

	var definitions = {};
	function getDefinition(value) {
		// When url() comes from a style property, '#'' seems to be missing on
		// WebKit, so let's make it optional here:
		var match = value && value.match(/\((?:#|)([^)']+)/);
		return match && definitions[match[1]];
	}

	function importSVG(source, options, isRoot) {
		if (!source)
			return null;
		if (!options) {
			options = {};
		} else if (typeof options === 'function') {
			options = { onLoad: options };
		}

		var node = source,
			// Remember current scope so we can restore it in onLoad.
			scope = paper;

		function onLoadCallback(svg) {
			paper = scope;
			var item = importSVG(svg, options, isRoot),
				onLoad = options.onLoad,
				view = scope.project && scope.getView();
			if (onLoad)
				onLoad.call(this, item);
			view.update();
		}

		if (isRoot) {
			// Have the group not pass on all transformations to its children,
			// as this is how SVG works too.
			// See if it's a string but handle markup separately
			if (typeof source === 'string' && !/^.*</.test(source)) {
			// TODO: Implement!
			} else if (typeof File !== 'undefined' && source instanceof File) {
				// Load local file through FileReader
				var reader = new FileReader();
				reader.onload = function() {
					onLoadCallback(reader.result);
				};
				return reader.readAsText(source);
			}
		}

		if (typeof source === 'string')
			node = new DOMParser().parseFromString(source, 'image/svg+xml');
		if (!node.nodeName)
			throw new Error('Unsupported SVG source: ' + source);
		// jsdom in Node.js uses uppercase values for nodeName...
		var type = node.nodeName.toLowerCase(),
			importer = importers[type],
			item,
			data = node.getAttribute && node.getAttribute('data-paper-data'),
			settings = scope.settings,
			applyMatrix = settings.applyMatrix;
		// Have items imported from SVG not bake in all transformations to their
		// content and children, as this is how SVG works too, but preserve the
		// current setting so we can restore it after.
		settings.applyMatrix = false;
		item = importer && importer(node, type, options, isRoot) || null;
		settings.applyMatrix = applyMatrix;
		if (item) {
			// Do not apply attributes if this is a #document node.
			// See importGroup() for an explanation of filtering for Group:
			if (type !== '#document' && !(item instanceof Group))
				item = applyAttributes(item, node, isRoot);
			// Support onImportItem callback, to provide mechanism to handle
			// special attributes (e.g. inkscape:transform-center)
			var onImport = options.onImport;
			if (onImport)
				item = onImport(node, item, options) || item;
			if (options.expandShapes && item instanceof Shape) {
				item.remove();
				item = item.toPath();
			}
			if (data)
				item._data = JSON.parse(data);
		}
		// Clear definitions at the end of import?
		if (isRoot) {
			definitions = {};
			// Now if settings.applyMatrix was set, apply recursively and set
			// #applyMatrix = true on the item and all children.
			if (item && Base.pick(options.applyMatrix, applyMatrix))
				item.matrix.apply(true, true);
		}
		return item;
	}

	// NOTE: Documentation is in Item.js
	Item.inject({
		importSVG: function(node, options) {
			return this.addChild(importSVG(node, options, true));
		}
	});

	// NOTE: Documentation is in Project.js
	Project.inject({
		importSVG: function(node, options) {
			this.activate();
			return importSVG(node, options, true);
		}
	});
};


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
 * @name PaperScript
 * @namespace
 */
Base.exports.PaperScript = (function() {
	// Locally turn of exports and define for inlined acorn.
	// Just declaring the local vars is enough, as they will be undefined.
	var exports, define,
		// The scope into which the library is loaded.
		scope = this;
!function(e,r){return"object"==typeof exports&&"object"==typeof module?r(exports):"function"==typeof define&&define.amd?define(["exports"],r):void r(e.acorn||(e.acorn={}))}(this,function(e){"use strict";function r(e){fe=e||{};for(var r in he)Object.prototype.hasOwnProperty.call(fe,r)||(fe[r]=he[r]);me=fe.sourceFile||null}function t(e,r){var t=ve(de,e);r+=" ("+t.line+":"+t.column+")";var n=new SyntaxError(r);throw n.pos=e,n.loc=t,n.raisedAt=be,n}function n(e){function r(e){if(1==e.length)return t+="return str === "+JSON.stringify(e[0])+";";t+="switch(str){";for(var r=0;r<e.length;++r)t+="case "+JSON.stringify(e[r])+":";t+="return true}return false;"}e=e.split(" ");var t="",n=[];e:for(var a=0;a<e.length;++a){for(var o=0;o<n.length;++o)if(n[o][0].length==e[a].length){n[o].push(e[a]);continue e}n.push([e[a]])}if(n.length>3){n.sort(function(e,r){return r.length-e.length}),t+="switch(str.length){";for(var a=0;a<n.length;++a){var i=n[a];t+="case "+i[0].length+":",r(i)}t+="}"}else r(e);return new Function("str",t)}function a(){this.line=Ae,this.column=be-Se}function o(){Ae=1,be=Se=0,Ee=!0,u()}function i(e,r){ge=be,fe.locations&&(ke=new a),we=e,u(),Ce=r,Ee=e.beforeExpr}function s(){var e=fe.onComment&&fe.locations&&new a,r=be,n=de.indexOf("*/",be+=2);if(-1===n&&t(be-2,"Unterminated comment"),be=n+2,fe.locations){Kr.lastIndex=r;for(var o;(o=Kr.exec(de))&&o.index<be;)++Ae,Se=o.index+o[0].length}fe.onComment&&fe.onComment(!0,de.slice(r+2,n),r,be,e,fe.locations&&new a)}function c(){for(var e=be,r=fe.onComment&&fe.locations&&new a,t=de.charCodeAt(be+=2);pe>be&&10!==t&&13!==t&&8232!==t&&8233!==t;)++be,t=de.charCodeAt(be);fe.onComment&&fe.onComment(!1,de.slice(e+2,be),e,be,r,fe.locations&&new a)}function u(){for(;pe>be;){var e=de.charCodeAt(be);if(32===e)++be;else if(13===e){++be;var r=de.charCodeAt(be);10===r&&++be,fe.locations&&(++Ae,Se=be)}else if(10===e||8232===e||8233===e)++be,fe.locations&&(++Ae,Se=be);else if(e>8&&14>e)++be;else if(47===e){var r=de.charCodeAt(be+1);if(42===r)s();else{if(47!==r)break;c()}}else if(160===e)++be;else{if(!(e>=5760&&Jr.test(String.fromCharCode(e))))break;++be}}}function l(){var e=de.charCodeAt(be+1);return e>=48&&57>=e?E(!0):(++be,i(xr))}function f(){var e=de.charCodeAt(be+1);return Ee?(++be,k()):61===e?x(Er,2):x(wr,1)}function d(){var e=de.charCodeAt(be+1);return 61===e?x(Er,2):x(Dr,1)}function p(e){var r=de.charCodeAt(be+1);return r===e?x(124===e?Lr:Ur,2):61===r?x(Er,2):x(124===e?Rr:Tr,1)}function m(){var e=de.charCodeAt(be+1);return 61===e?x(Er,2):x(Vr,1)}function h(e){var r=de.charCodeAt(be+1);return r===e?45==r&&62==de.charCodeAt(be+2)&&Gr.test(de.slice(Le,be))?(be+=3,c(),u(),g()):x(Sr,2):61===r?x(Er,2):x(Ar,1)}function v(e){var r=de.charCodeAt(be+1),t=1;return r===e?(t=62===e&&62===de.charCodeAt(be+2)?3:2,61===de.charCodeAt(be+t)?x(Er,t+1):x(jr,t)):33==r&&60==e&&45==de.charCodeAt(be+2)&&45==de.charCodeAt(be+3)?(be+=4,c(),u(),g()):(61===r&&(t=61===de.charCodeAt(be+2)?3:2),x(Or,t))}function b(e){var r=de.charCodeAt(be+1);return 61===r?x(qr,61===de.charCodeAt(be+2)?3:2):x(61===e?Cr:Ir,1)}function y(e){switch(e){case 46:return l();case 40:return++be,i(hr);case 41:return++be,i(vr);case 59:return++be,i(yr);case 44:return++be,i(br);case 91:return++be,i(fr);case 93:return++be,i(dr);case 123:return++be,i(pr);case 125:return++be,i(mr);case 58:return++be,i(gr);case 63:return++be,i(kr);case 48:var r=de.charCodeAt(be+1);if(120===r||88===r)return C();case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return E(!1);case 34:case 39:return A(e);case 47:return f(e);case 37:case 42:return d();case 124:case 38:return p(e);case 94:return m();case 43:case 45:return h(e);case 60:case 62:return v(e);case 61:case 33:return b(e);case 126:return x(Ir,1)}return!1}function g(e){if(e?be=ye+1:ye=be,fe.locations&&(xe=new a),e)return k();if(be>=pe)return i(Be);var r=de.charCodeAt(be);if(Qr(r)||92===r)return L();var n=y(r);if(n===!1){var o=String.fromCharCode(r);if("\\"===o||$r.test(o))return L();t(be,"Unexpected character '"+o+"'")}return n}function x(e,r){var t=de.slice(be,be+r);be+=r,i(e,t)}function k(){for(var e,r,n="",a=be;;){be>=pe&&t(a,"Unterminated regular expression");var o=de.charAt(be);if(Gr.test(o)&&t(a,"Unterminated regular expression"),e)e=!1;else{if("["===o)r=!0;else if("]"===o&&r)r=!1;else if("/"===o&&!r)break;e="\\"===o}++be}var n=de.slice(a,be);++be;var s=I();return s&&!/^[gmsiy]*$/.test(s)&&t(a,"Invalid regexp flag"),i(je,new RegExp(n,s))}function w(e,r){for(var t=be,n=0,a=0,o=null==r?1/0:r;o>a;++a){var i,s=de.charCodeAt(be);if(i=s>=97?s-97+10:s>=65?s-65+10:s>=48&&57>=s?s-48:1/0,i>=e)break;++be,n=n*e+i}return be===t||null!=r&&be-t!==r?null:n}function C(){be+=2;var e=w(16);return null==e&&t(ye+2,"Expected hexadecimal number"),Qr(de.charCodeAt(be))&&t(be,"Identifier directly after number"),i(Oe,e)}function E(e){var r=be,n=!1,a=48===de.charCodeAt(be);e||null!==w(10)||t(r,"Invalid number"),46===de.charCodeAt(be)&&(++be,w(10),n=!0);var o=de.charCodeAt(be);(69===o||101===o)&&(o=de.charCodeAt(++be),(43===o||45===o)&&++be,null===w(10)&&t(r,"Invalid number"),n=!0),Qr(de.charCodeAt(be))&&t(be,"Identifier directly after number");var s,c=de.slice(r,be);return n?s=parseFloat(c):a&&1!==c.length?/[89]/.test(c)||Te?t(r,"Invalid number"):s=parseInt(c,8):s=parseInt(c,10),i(Oe,s)}function A(e){be++;for(var r="";;){be>=pe&&t(ye,"Unterminated string constant");var n=de.charCodeAt(be);if(n===e)return++be,i(De,r);if(92===n){n=de.charCodeAt(++be);var a=/^[0-7]+/.exec(de.slice(be,be+3));for(a&&(a=a[0]);a&&parseInt(a,8)>255;)a=a.slice(0,a.length-1);if("0"===a&&(a=null),++be,a)Te&&t(be-2,"Octal literal in strict mode"),r+=String.fromCharCode(parseInt(a,8)),be+=a.length-1;else switch(n){case 110:r+="\n";break;case 114:r+="\r";break;case 120:r+=String.fromCharCode(S(2));break;case 117:r+=String.fromCharCode(S(4));break;case 85:r+=String.fromCharCode(S(8));break;case 116:r+="	";break;case 98:r+="\b";break;case 118:r+="";break;case 102:r+="\f";break;case 48:r+="\x00";break;case 13:10===de.charCodeAt(be)&&++be;case 10:fe.locations&&(Se=be,++Ae);break;default:r+=String.fromCharCode(n)}}else(13===n||10===n||8232===n||8233===n)&&t(ye,"Unterminated string constant"),r+=String.fromCharCode(n),++be}}function S(e){var r=w(16,e);return null===r&&t(ye,"Bad character escape sequence"),r}function I(){Br=!1;for(var e,r=!0,n=be;;){var a=de.charCodeAt(be);if(Yr(a))Br&&(e+=de.charAt(be)),++be;else{if(92!==a)break;Br||(e=de.slice(n,be)),Br=!0,117!=de.charCodeAt(++be)&&t(be,"Expecting Unicode escape sequence \\uXXXX"),++be;var o=S(4),i=String.fromCharCode(o);i||t(be-1,"Invalid Unicode escape"),(r?Qr(o):Yr(o))||t(be-4,"Invalid Unicode escape"),e+=i}r=!1}return Br?e:de.slice(n,be)}function L(){var e=I(),r=Fe;return Br||(Wr(e)?r=lr[e]:(fe.forbidReserved&&(3===fe.ecmaVersion?Mr:zr)(e)||Te&&Xr(e))&&t(ye,"The keyword '"+e+"' is reserved")),i(r,e)}function U(){Ie=ye,Le=ge,Ue=ke,g()}function R(e){if(Te=e,be=Le,fe.locations)for(;Se>be;)Se=de.lastIndexOf("\n",Se-2)+1,--Ae;u(),g()}function V(){this.type=null,this.start=ye,this.end=null}function T(){this.start=xe,this.end=null,null!==me&&(this.source=me)}function q(){var e=new V;return fe.locations&&(e.loc=new T),fe.ranges&&(e.range=[ye,0]),e}function O(e){var r=new V;return r.start=e.start,fe.locations&&(r.loc=new T,r.loc.start=e.loc.start),fe.ranges&&(r.range=[e.range[0],0]),r}function j(e,r){return e.type=r,e.end=Le,fe.locations&&(e.loc.end=Ue),fe.ranges&&(e.range[1]=Le),e}function D(e){return fe.ecmaVersion>=5&&"ExpressionStatement"===e.type&&"Literal"===e.expression.type&&"use strict"===e.expression.value}function F(e){return we===e?(U(),!0):void 0}function B(){return!fe.strictSemicolons&&(we===Be||we===mr||Gr.test(de.slice(Le,ye)))}function M(){F(yr)||B()||X()}function z(e){we===e?U():X()}function X(){t(ye,"Unexpected token")}function N(e){"Identifier"!==e.type&&"MemberExpression"!==e.type&&t(e.start,"Assigning to rvalue"),Te&&"Identifier"===e.type&&Nr(e.name)&&t(e.start,"Assigning to "+e.name+" in strict mode")}function W(e){Ie=Le=be,fe.locations&&(Ue=new a),Re=Te=null,Ve=[],g();var r=e||q(),t=!0;for(e||(r.body=[]);we!==Be;){var n=J();r.body.push(n),t&&D(n)&&R(!0),t=!1}return j(r,"Program")}function J(){(we===wr||we===Er&&"/="==Ce)&&g(!0);var e=we,r=q();switch(e){case Me:case Ne:U();var n=e===Me;F(yr)||B()?r.label=null:we!==Fe?X():(r.label=le(),M());for(var a=0;a<Ve.length;++a){var o=Ve[a];if(null==r.label||o.name===r.label.name){if(null!=o.kind&&(n||"loop"===o.kind))break;if(r.label&&n)break}}return a===Ve.length&&t(r.start,"Unsyntactic "+e.keyword),j(r,n?"BreakStatement":"ContinueStatement");case We:return U(),M(),j(r,"DebuggerStatement");case Pe:return U(),Ve.push(Zr),r.body=J(),Ve.pop(),z(tr),r.test=P(),M(),j(r,"DoWhileStatement");case _e:if(U(),Ve.push(Zr),z(hr),we===yr)return $(r,null);if(we===rr){var i=q();return U(),G(i,!0),j(i,"VariableDeclaration"),1===i.declarations.length&&F(ur)?_(r,i):$(r,i)}var i=K(!1,!0);return F(ur)?(N(i),_(r,i)):$(r,i);case Ge:return U(),ce(r,!0);case Ke:return U(),r.test=P(),r.consequent=J(),r.alternate=F(He)?J():null,j(r,"IfStatement");case Qe:return Re||t(ye,"'return' outside of function"),U(),F(yr)||B()?r.argument=null:(r.argument=K(),M()),j(r,"ReturnStatement");case Ye:U(),r.discriminant=P(),r.cases=[],z(pr),Ve.push(et);for(var s,c;we!=mr;)if(we===ze||we===Je){var u=we===ze;s&&j(s,"SwitchCase"),r.cases.push(s=q()),s.consequent=[],U(),u?s.test=K():(c&&t(Ie,"Multiple default clauses"),c=!0,s.test=null),z(gr)}else s||X(),s.consequent.push(J());return s&&j(s,"SwitchCase"),U(),Ve.pop(),j(r,"SwitchStatement");case Ze:return U(),Gr.test(de.slice(Le,ye))&&t(Le,"Illegal newline after throw"),r.argument=K(),M(),j(r,"ThrowStatement");case er:if(U(),r.block=H(),r.handler=null,we===Xe){var l=q();U(),z(hr),l.param=le(),Te&&Nr(l.param.name)&&t(l.param.start,"Binding "+l.param.name+" in strict mode"),z(vr),l.guard=null,l.body=H(),r.handler=j(l,"CatchClause")}return r.guardedHandlers=qe,r.finalizer=F($e)?H():null,r.handler||r.finalizer||t(r.start,"Missing catch or finally clause"),j(r,"TryStatement");case rr:return U(),G(r),M(),j(r,"VariableDeclaration");case tr:return U(),r.test=P(),Ve.push(Zr),r.body=J(),Ve.pop(),j(r,"WhileStatement");case nr:return Te&&t(ye,"'with' in strict mode"),U(),r.object=P(),r.body=J(),j(r,"WithStatement");case pr:return H();case yr:return U(),j(r,"EmptyStatement");default:var f=Ce,d=K();if(e===Fe&&"Identifier"===d.type&&F(gr)){for(var a=0;a<Ve.length;++a)Ve[a].name===f&&t(d.start,"Label '"+f+"' is already declared");var p=we.isLoop?"loop":we===Ye?"switch":null;return Ve.push({name:f,kind:p}),r.body=J(),Ve.pop(),r.label=d,j(r,"LabeledStatement")}return r.expression=d,M(),j(r,"ExpressionStatement")}}function P(){z(hr);var e=K();return z(vr),e}function H(e){var r,t=q(),n=!0,a=!1;for(t.body=[],z(pr);!F(mr);){var o=J();t.body.push(o),n&&e&&D(o)&&(r=a,R(a=!0)),n=!1}return a&&!r&&R(!1),j(t,"BlockStatement")}function $(e,r){return e.init=r,z(yr),e.test=we===yr?null:K(),z(yr),e.update=we===vr?null:K(),z(vr),e.body=J(),Ve.pop(),j(e,"ForStatement")}function _(e,r){return e.left=r,e.right=K(),z(vr),e.body=J(),Ve.pop(),j(e,"ForInStatement")}function G(e,r){for(e.declarations=[],e.kind="var";;){var n=q();if(n.id=le(),Te&&Nr(n.id.name)&&t(n.id.start,"Binding "+n.id.name+" in strict mode"),n.init=F(Cr)?K(!0,r):null,e.declarations.push(j(n,"VariableDeclarator")),!F(br))break}return e}function K(e,r){var t=Q(r);if(!e&&we===br){var n=O(t);for(n.expressions=[t];F(br);)n.expressions.push(Q(r));return j(n,"SequenceExpression")}return t}function Q(e){var r=Y(e);if(we.isAssign){var t=O(r);return t.operator=Ce,t.left=r,U(),t.right=Q(e),N(r),j(t,"AssignmentExpression")}return r}function Y(e){var r=Z(e);if(F(kr)){var t=O(r);return t.test=r,t.consequent=K(!0),z(gr),t.alternate=K(!0,e),j(t,"ConditionalExpression")}return r}function Z(e){return ee(re(),-1,e)}function ee(e,r,t){var n=we.binop;if(null!=n&&(!t||we!==ur)&&n>r){var a=O(e);a.left=e,a.operator=Ce,U(),a.right=ee(re(),n,t);var o=j(a,/&&|\|\|/.test(a.operator)?"LogicalExpression":"BinaryExpression");return ee(o,r,t)}return e}function re(){if(we.prefix){var e=q(),r=we.isUpdate;return e.operator=Ce,e.prefix=!0,Ee=!0,U(),e.argument=re(),r?N(e.argument):Te&&"delete"===e.operator&&"Identifier"===e.argument.type&&t(e.start,"Deleting local variable in strict mode"),j(e,r?"UpdateExpression":"UnaryExpression")}for(var n=te();we.postfix&&!B();){var e=O(n);e.operator=Ce,e.prefix=!1,e.argument=n,N(n),U(),n=j(e,"UpdateExpression")}return n}function te(){return ne(ae())}function ne(e,r){if(F(xr)){var t=O(e);return t.object=e,t.property=le(!0),t.computed=!1,ne(j(t,"MemberExpression"),r)}if(F(fr)){var t=O(e);return t.object=e,t.property=K(),t.computed=!0,z(dr),ne(j(t,"MemberExpression"),r)}if(!r&&F(hr)){var t=O(e);return t.callee=e,t.arguments=ue(vr,!1),ne(j(t,"CallExpression"),r)}return e}function ae(){switch(we){case or:var e=q();return U(),j(e,"ThisExpression");case Fe:return le();case Oe:case De:case je:var e=q();return e.value=Ce,e.raw=de.slice(ye,ge),U(),j(e,"Literal");case ir:case sr:case cr:var e=q();return e.value=we.atomValue,e.raw=we.keyword,U(),j(e,"Literal");case hr:var r=xe,t=ye;U();var n=K();return n.start=t,n.end=ge,fe.locations&&(n.loc.start=r,n.loc.end=ke),fe.ranges&&(n.range=[t,ge]),z(vr),n;case fr:var e=q();return U(),e.elements=ue(dr,!0,!0),j(e,"ArrayExpression");case pr:return ie();case Ge:var e=q();return U(),ce(e,!1);case ar:return oe();default:X()}}function oe(){var e=q();return U(),e.callee=ne(ae(),!0),F(hr)?e.arguments=ue(vr,!1):e.arguments=qe,j(e,"NewExpression")}function ie(){var e=q(),r=!0,n=!1;for(e.properties=[],U();!F(mr);){if(r)r=!1;else if(z(br),fe.allowTrailingCommas&&F(mr))break;var a,o={key:se()},i=!1;if(F(gr)?(o.value=K(!0),a=o.kind="init"):fe.ecmaVersion>=5&&"Identifier"===o.key.type&&("get"===o.key.name||"set"===o.key.name)?(i=n=!0,a=o.kind=o.key.name,o.key=se(),we!==hr&&X(),o.value=ce(q(),!1)):X(),"Identifier"===o.key.type&&(Te||n))for(var s=0;s<e.properties.length;++s){var c=e.properties[s];if(c.key.name===o.key.name){var u=a==c.kind||i&&"init"===c.kind||"init"===a&&("get"===c.kind||"set"===c.kind);u&&!Te&&"init"===a&&"init"===c.kind&&(u=!1),u&&t(o.key.start,"Redefinition of property")}}e.properties.push(o)}return j(e,"ObjectExpression")}function se(){return we===Oe||we===De?ae():le(!0)}function ce(e,r){we===Fe?e.id=le():r?X():e.id=null,e.params=[];var n=!0;for(z(hr);!F(vr);)n?n=!1:z(br),e.params.push(le());var a=Re,o=Ve;if(Re=!0,Ve=[],e.body=H(!0),Re=a,Ve=o,Te||e.body.body.length&&D(e.body.body[0]))for(var i=e.id?-1:0;i<e.params.length;++i){var s=0>i?e.id:e.params[i];if((Xr(s.name)||Nr(s.name))&&t(s.start,"Defining '"+s.name+"' in strict mode"),i>=0)for(var c=0;i>c;++c)s.name===e.params[c].name&&t(s.start,"Argument name clash in strict mode")}return j(e,r?"FunctionDeclaration":"FunctionExpression")}function ue(e,r,t){for(var n=[],a=!0;!F(e);){if(a)a=!1;else if(z(br),r&&fe.allowTrailingCommas&&F(e))break;t&&we===br?n.push(null):n.push(K(!0))}return n}function le(e){var r=q();return r.name=we===Fe?Ce:e&&!fe.forbidReserved&&we.keyword||X(),Ee=!1,U(),j(r,"Identifier")}e.version="0.4.0";var fe,de,pe,me;e.parse=function(e,t){return de=String(e),pe=de.length,r(t),o(),W(fe.program)};var he=e.defaultOptions={ecmaVersion:5,strictSemicolons:!1,allowTrailingCommas:!0,forbidReserved:!1,locations:!1,onComment:null,ranges:!1,program:null,sourceFile:null},ve=e.getLineInfo=function(e,r){for(var t=1,n=0;;){Kr.lastIndex=n;var a=Kr.exec(e);if(!(a&&a.index<r))break;++t,n=a.index+a[0].length}return{line:t,column:r-n}};e.tokenize=function(e,t){function n(e){return g(e),a.start=ye,a.end=ge,a.startLoc=xe,a.endLoc=ke,a.type=we,a.value=Ce,a}de=String(e),pe=de.length,r(t),o();var a={};return n.jumpTo=function(e,r){if(be=e,fe.locations){Ae=1,Se=Kr.lastIndex=0;for(var t;(t=Kr.exec(de))&&t.index<e;)++Ae,Se=t.index+t[0].length}Ee=r,u()},n};var be,ye,ge,xe,ke,we,Ce,Ee,Ae,Se,Ie,Le,Ue,Re,Ve,Te,qe=[],Oe={type:"num"},je={type:"regexp"},De={type:"string"},Fe={type:"name"},Be={type:"eof"},Me={keyword:"break"},ze={keyword:"case",beforeExpr:!0},Xe={keyword:"catch"},Ne={keyword:"continue"},We={keyword:"debugger"},Je={keyword:"default"},Pe={keyword:"do",isLoop:!0},He={keyword:"else",beforeExpr:!0},$e={keyword:"finally"},_e={keyword:"for",isLoop:!0},Ge={keyword:"function"},Ke={keyword:"if"},Qe={keyword:"return",beforeExpr:!0},Ye={keyword:"switch"},Ze={keyword:"throw",beforeExpr:!0},er={keyword:"try"},rr={keyword:"var"},tr={keyword:"while",isLoop:!0},nr={keyword:"with"},ar={keyword:"new",beforeExpr:!0},or={keyword:"this"},ir={keyword:"null",atomValue:null},sr={keyword:"true",atomValue:!0},cr={keyword:"false",atomValue:!1},ur={keyword:"in",binop:7,beforeExpr:!0},lr={"break":Me,"case":ze,"catch":Xe,"continue":Ne,"debugger":We,"default":Je,"do":Pe,"else":He,"finally":$e,"for":_e,"function":Ge,"if":Ke,"return":Qe,"switch":Ye,"throw":Ze,"try":er,"var":rr,"while":tr,"with":nr,"null":ir,"true":sr,"false":cr,"new":ar,"in":ur,"instanceof":{keyword:"instanceof",binop:7,beforeExpr:!0},"this":or,"typeof":{keyword:"typeof",prefix:!0,beforeExpr:!0},"void":{keyword:"void",prefix:!0,beforeExpr:!0},"delete":{keyword:"delete",prefix:!0,beforeExpr:!0}},fr={type:"[",beforeExpr:!0},dr={type:"]"},pr={type:"{",beforeExpr:!0},mr={type:"}"},hr={type:"(",beforeExpr:!0},vr={type:")"},br={type:",",beforeExpr:!0},yr={type:";",beforeExpr:!0},gr={type:":",beforeExpr:!0},xr={type:"."},kr={type:"?",beforeExpr:!0},wr={binop:10,beforeExpr:!0},Cr={isAssign:!0,beforeExpr:!0},Er={isAssign:!0,beforeExpr:!0},Ar={binop:9,prefix:!0,beforeExpr:!0},Sr={postfix:!0,prefix:!0,isUpdate:!0},Ir={prefix:!0,beforeExpr:!0},Lr={binop:1,beforeExpr:!0},Ur={binop:2,beforeExpr:!0},Rr={binop:3,beforeExpr:!0},Vr={binop:4,beforeExpr:!0},Tr={binop:5,beforeExpr:!0},qr={binop:6,beforeExpr:!0},Or={binop:7,beforeExpr:!0},jr={binop:8,beforeExpr:!0},Dr={binop:10,beforeExpr:!0};e.tokTypes={bracketL:fr,bracketR:dr,braceL:pr,braceR:mr,parenL:hr,parenR:vr,comma:br,semi:yr,colon:gr,dot:xr,question:kr,slash:wr,eq:Cr,name:Fe,eof:Be,num:Oe,regexp:je,string:De};for(var Fr in lr)e.tokTypes["_"+Fr]=lr[Fr];var Br,Mr=n("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile"),zr=n("class enum extends super const export import"),Xr=n("implements interface let package private protected public static yield"),Nr=n("eval arguments"),Wr=n("break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this"),Jr=/[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/,Pr="\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc",Hr="\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f",$r=new RegExp("["+Pr+"]"),_r=new RegExp("["+Pr+Hr+"]"),Gr=/[\n\r\u2028\u2029]/,Kr=/\r\n|[\n\r\u2028\u2029]/g,Qr=e.isIdentifierStart=function(e){return 65>e?36===e:91>e?!0:97>e?95===e:123>e?!0:e>=170&&$r.test(String.fromCharCode(e))},Yr=e.isIdentifierChar=function(e){return 48>e?36===e:58>e?!0:65>e?!1:91>e?!0:97>e?95===e:123>e?!0:e>=170&&_r.test(String.fromCharCode(e))},Zr={kind:"loop"},et={kind:"switch"}});

	// Operators to overload

	var binaryOperators = {
		// The hidden math methods are to be injected specifically, see below.
		'+': '__add',
		'-': '__subtract',
		'*': '__multiply',
		'/': '__divide',
		'%': '__modulo',
		// Use the real equals.
		'==': 'equals',
		'!=': 'equals'
	};

	var unaryOperators = {
		'-': '__negate',
		'+': null
	};

	// Inject underscored math methods as aliases to Point, Size and Color.
	var fields = Base.each(
		['add', 'subtract', 'multiply', 'divide', 'modulo', 'negate'],
		function(name) {
			// Create an alias for each math method to be injected into the
			// classes using Straps.js' #inject()
			this['__' + name] = '#' + name;
		},
		{}
	);
	Point.inject(fields);
	Size.inject(fields);
	Color.inject(fields);

	// Use very short name for the binary operator (__$__) as well as the
	// unary operator ($__), as operations will be replaced with then.
	// The underscores stands for the values, and the $ for the operators.

	// Binary Operator Handler
	function __$__(left, operator, right) {
		var handler = binaryOperators[operator];
		if (left && left[handler]) {
			var res = left[handler](right);
			return operator === '!=' ? !res : res;
		}
		switch (operator) {
		case '+': return left + right;
		case '-': return left - right;
		case '*': return left * right;
		case '/': return left / right;
		case '%': return left % right;
		case '==': return left == right;
		case '!=': return left != right;
		}
	}

	// Unary Operator Handler
	function $__(operator, value) {
		var handler = unaryOperators[operator];
		if (handler && value && value[handler])
			return value[handler]();
		switch (operator) {
		case '+': return +value;
		case '-': return -value;
		}
	}

	// AST Helpers

	function parse(code, options) {
		return scope.acorn.parse(code, options);
	}

	/**
	 * Compiles PaperScript code into JavaScript code.
	 *
	 * @name PaperScript.compile
	 * @function
	 * @param {String} code the PaperScript code
	 * @param {String} url the url of the source, for source-map debugging
	 * @return {String} the compiled PaperScript as JavaScript code
	 */
	function compile(code, url, options) {
		if (!code)
			return '';
		options = options || {};
		url = url || '';
		// Use Acorn or Esprima to translate the code into an AST structure
		// which is then walked and parsed for operators to overload. Instead of
		// modifying the AST and translating it back to code, we directly change
		// the source code based on the parser's range information, to preserve
		// line-numbers in syntax errors and remove the need for Escodegen.

		// Track code insertions so their differences can be added to the
		// original offsets.
		var insertions = [];

		// Converts an original offset to the one in the current state of the
		// modified code.
		function getOffset(offset) {
			// Add all insertions before this location together to calculate
			// the current offset
			for (var i = 0, l = insertions.length; i < l; i++) {
				var insertion = insertions[i];
				if (insertion[0] >= offset)
					break;
				offset += insertion[1];
			}
			return offset;
		}

		// Returns the node's code as a string, taking insertions into account.
		function getCode(node) {
			return code.substring(getOffset(node.range[0]),
					getOffset(node.range[1]));
		}

		// Returns the code between two nodes, e.g. an operator and white-space.
		function getBetween(left, right) {
			return code.substring(getOffset(left.range[1]),
					getOffset(right.range[0]));
		}

		// Replaces the node's code with a new version and keeps insertions
		// information up-to-date.
		function replaceCode(node, str) {
			var start = getOffset(node.range[0]),
				end = getOffset(node.range[1]),
				insert = 0;
			// Sort insertions by their offset, so getOffest() can do its thing
			for (var i = insertions.length - 1; i >= 0; i--) {
				if (start > insertions[i][0]) {
					insert = i + 1;
					break;
				}
			}
			insertions.splice(insert, 0, [start, str.length - end + start]);
			code = code.substring(0, start) + str + code.substring(end);
		}

		// Recursively walks the AST and replaces the code of certain nodes
		function walkAST(node, parent) {
			if (!node)
				return;
			// The easiest way to walk through the whole AST is to simply loop
			// over each property of the node and filter out fields we don't
			// need to consider...
			for (var key in node) {
				if (key === 'range' || key === 'loc')
					continue;
				var value = node[key];
				if (Array.isArray(value)) {
					for (var i = 0, l = value.length; i < l; i++)
						walkAST(value[i], node);
				} else if (value && typeof value === 'object') {
					// We cannot use Base.isPlainObject() for these since
					// Acorn.js uses its own internal prototypes now.
					walkAST(value, node);
				}
			}
			switch (node.type) {
			case 'UnaryExpression': // -a
				if (node.operator in unaryOperators
						&& node.argument.type !== 'Literal') {
					var arg = getCode(node.argument);
					replaceCode(node, '$__("' + node.operator + '", '
							+ arg + ')');
				}
				break;
			case 'BinaryExpression': // a + b, a - b, a / b, a * b, a == b, ...
				if (node.operator in binaryOperators
						&& node.left.type !== 'Literal') {
					var left = getCode(node.left),
						right = getCode(node.right),
						between = getBetween(node.left, node.right),
						operator = node.operator;
					replaceCode(node, '__$__(' + left + ','
							// To preserve line-breaks, get the code in between
							// left & right, and replace the occurrence of the
							// operator with its string counterpart:
							+ between.replace(new RegExp('\\' + operator),
								'"' + operator + '"')
							+ ', ' + right + ')');
				}
				break;
			case 'UpdateExpression': // a++, a--, ++a, --a
			case 'AssignmentExpression': /// a += b, a -= b
				var parentType = parent && parent.type;
				if (!(
						// Filter out for statements to allow loop increments
						// to perform well
						parentType === 'ForStatement'
						// We need to filter out parents that are comparison
						// operators, e.g. for situations like `if (++i < 1)`,
						// as we can't replace that with
						// `if (__$__(i, "+", 1) < 1)`
						// Match any operator beginning with =, !, < and >.
						|| parentType === 'BinaryExpression'
							&& /^[=!<>]/.test(parent.operator)
						// array[i++] is a MemberExpression with computed = true
						// We can't replace that with array[__$__(i, "+", 1)].
						|| parentType === 'MemberExpression' && parent.computed
				)) {
					if (node.type === 'UpdateExpression') {
						var arg = getCode(node.argument),
							exp = '__$__(' + arg + ', "' + node.operator[0]
									+ '", 1)',
							str = arg + ' = ' + exp;
						// If this is not a prefixed update expression
						// (++a, --a), assign the old value before updating it.
						if (!node.prefix
								&& (parentType === 'AssignmentExpression'
									|| parentType === 'VariableDeclarator')) {
							// Handle special issue #691 where the old value is
							// assigned to itself, and the expression is just
							// executed after, e.g.: `var x = ***; x = x++;`
							if (getCode(parent.left || parent.id) === arg)
								str = exp;
							str = arg + '; ' + str;
						}
						replaceCode(node, str);
					} else { // AssignmentExpression
						if (/^.=$/.test(node.operator)
								&& node.left.type !== 'Literal') {
							var left = getCode(node.left),
								right = getCode(node.right);
							replaceCode(node, left + ' = __$__(' + left + ', "'
									+ node.operator[0] + '", ' + right + ')');
						}
					}
				}
				break;
			}
		}
		// Now do the parsing magic
		walkAST(parse(code, { ranges: true }));
		return code;
	}

	/**
	 * Executes the parsed PaperScript code in a compiled function that receives
	 * all properties of the passed {@link PaperScope} as arguments, to emulate
	 * a global scope with unaffected performance. It also installs global view
	 * and tool handlers automatically for you.
	 *
	 * @name PaperScript.execute
	 * @function
	 * @param {String} code the PaperScript code
	 * @param {PaperScope} scope the scope for which the code is executed
	 * @param {String} url the url of the source, for source-map debugging
	 */
	function execute(code, scope, url, options) {
		// Set currently active scope.
		paper = scope;
		var view = scope.getView(),
			// Only create a tool object if something resembling a tool handler
			// definition is contained in the code.
			tool = /\s+on(?:Key|Mouse)(?:Up|Down|Move|Drag)\b/.test(code)
					? new Tool()
					: null,
			toolHandlers = tool ? tool._events : [],
			// Compile a list of all handlers that can be defined globally
			// inside the PaperScript. These are passed on to the function as
			// undefined arguments, so that their name exists, rather than
			// injecting a code line that defines them as variables.
			// They are exported again at the end of the function.
			handlers = ['onFrame', 'onResize'].concat(toolHandlers),
			// compile a list of parameter names for all variables that need to
			// appear as globals inside the script. At the same time, also
			// collect their values, so we can pass them on as arguments in the
			// function call.
			params = [],
			args = [],
			func;
		code = compile(code, url, options);
		function expose(scope, hidden) {
			// Look through all enumerable properties on the scope and expose
			// these too as pseudo-globals, but only if they seem to be in use.
			for (var key in scope) {
				// Next to \b well also need to match \s and \W in the beginning
				// of $__, since $ is not part of \w. And that causes \b to not
				// match ^ longer, so include that specifically too.
				if ((hidden || !/^_/.test(key)) && new RegExp('([\\b\\s\\W]|^)'
						+ key.replace(/\$/g, '\\$') + '\\b').test(code)) {
					params.push(key);
					args.push(scope[key]);
				}
			}
		}
		expose({ __$__: __$__, $__: $__, paper: scope, view: view, tool: tool },
				true);
		expose(scope);
		// Finally define the handler variable names as parameters and compose
		// the string describing the properties for the returned object at the
		// end of the code execution, so we can retrieve their values from the
		// function call.
		handlers = Base.each(handlers, function(key) {
			// Check for each handler explicitly and only return them if they
			// seem to exist.
			if (new RegExp('\\s+' + key + '\\b').test(code)) {
				params.push(key);
				this.push(key + ': ' + key);
			}
		}, []).join(', ');
		// We need an additional line that returns the handlers in one object.
		if (handlers)
			code += '\nreturn { ' + handlers + ' };';
		func = Function(params, code);
		var res = func.apply(scope, args) || {};
		// Now install the 'global' tool and view handlers, and we're done!
		Base.each(toolHandlers, function(key) {
			var value = res[key];
			if (value)
				tool[key] = value;
		});
		if (view) {
			if (res.onResize)
				view.setOnResize(res.onResize);
			// Emit resize event directly, so any user
			// defined resize handlers are called.
			view.emit('resize', {
				size: view.size,
				delta: new Point()
			});
			if (res.onFrame)
				view.setOnFrame(res.onFrame);
			// Automatically update view at the end.
			view.update();
		}
	}


	// Register the .pjs extension for automatic compilation as PaperScript
	var fs = require('fs'),
		path = require('path');

	require.extensions['.pjs'] = function(module, uri) {
		// Requiring a PaperScript on Node.js returns an initialize method which
		// needs to receive a Canvas object when called and returns the
		// PaperScope.
		module.exports = function(canvas) {
			var source = compile(fs.readFileSync(uri, 'utf8')),
				scope = new PaperScope();
			scope.setup(canvas);
			scope.__filename = uri;
			scope.__dirname = path.dirname(uri);
			// Expose core methods and values
			scope.require = require;
			scope.console = console;
			execute(source, scope);
			return scope;
		};
	};


	return {
		compile: compile,
		execute: execute,
		parse: parse
	};

// Pass on `this` as the binding object, so we can reference Acorn both in
// development and in the built library.
}).call(this);


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

// First add Base and a couple of other objects that are not automatically
// exported to exports (Numerical, Key, etc), then inject all exports into
// PaperScope, and create the initial paper object, all in one statement:

paper = new (PaperScope.inject(Base.exports, {
	// Mark fields as enumerable so PaperScope.inject can pick them up
	enumerable: true,
	Base: Base,
	Numerical: Numerical,
	// Export dom/node.js stuff too
	XMLSerializer: XMLSerializer,
	DOMParser: DOMParser,
	Canvas: Canvas
}))();

// Export the paper scope.
module.exports = paper;


return paper;
};
