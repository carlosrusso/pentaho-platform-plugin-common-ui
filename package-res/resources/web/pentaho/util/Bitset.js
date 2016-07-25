define([
  "pentaho/lang/Base"
], function(Base) {

  "use strict";

  // Allow ~0
  // jshint -W016

  return Base.extend(/** @lends pentaho.util.BitSet# */{

    /**
     * The `BitSet` class represents a set data structure that is
     * very efficient and can hold up to 31 elements, or bits.
     *
     * @alias BitSet
     * @memberOf pentaho.util
     * @class
     * @extends pentaho.lang.Base
     *
     * @private
     *
     * @description Creates a bit set instance.
     * @constructor
     * @param {?number} [mask] - The bits to be set, initially. Defaults to no bits.
     */
    constructor: function(bits) {
      this.set(bits || 0);
    },

    /**
     * Returns a value that indicates if there are no bits set.
     *
     * @return {boolean} `true` if no bits are set, `false` otherwise.
     */
    get isEmpty() {
      return this._bits === 0;
    },

    /**
     * Returns an integer number with the bits currently set.
     *
     * @return {number} An integer containing the bits currently set.
     */
    get: function() {
      return this._bits;
    },

    /**
     * Returns a value that indicates if the current state is equal to a given mask.
     *
     * @param {number} mask - An integer containing the bit mask to test.
     *
     * @return {boolean} `true` when `mask` is equal to the current state; `false` otherwise.
     */
    is: function(mask) {
      return this._bits === mask;
    },

    /**
     * Sets the current state to a given mask.
     *
     * @param {?number} [mask] - The bits to be set. Defaults to all bits.
     */
    set: function(mask) {
      this._bits = (mask == null) ? ~0 : (this._bits | mask);
    },

    /**
     * Clears a set of bits.
     *
     * @param {?number} [mask] - The bits to be cleared. Defaults to all bits.
     */
    clear: function(mask) {
      this._bits = (mask == null) ? 0 : (this._bits & ~mask);
    },

    /**
     * Returns a value that indicates if the current state is a subset of a given mask.
     *
     * Use this method to assert if no bits other than those described by the mask are currently set.
     *
     * @param {!number} mask - An integer containing the bit mask to test.
     *
     * @return {boolean} `true` if the bits currently set are within the specified mask; `false` otherwise.
     */
    isSubsetOf: function(mask) {
      var bits = this._bits;
      return (bits !== 0) && ((bits | mask) === mask);
    }
  });
});