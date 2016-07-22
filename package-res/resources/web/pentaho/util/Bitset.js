define([
  "pentaho/lang/Base"
], function(Base) {
  "use strict";

  return Base.extend(/** @lends pentaho.util.Bitset# */{

    constructor: function(bits) {
      this.set(bits);
    },

    /**
     * Returns a value that indicates if all bits are cleared.
     *
     * @returns {boolean} `true` if no bits are set, `false` otherwise.
     */
    get isClear (){
      return this.bits === 0;
    },

    /**
     * Returns an integer number with the bits currently set.
     *
     * @return {number} An integer with the bits currently set.
     */
    get: function(){
      return this._bits;
    },

    /**
     * Tests if the current state is equal to a given mask.
     *
     * @param {!number} mask - An integer containing the bit mask to test.
     * @return {boolean}
     */
    is: function(mask){
      return this._bits === mask;
    },

    /**
     * Sets the current state to a given mask.
     *
     * If a `nully` argument is provided, all bits are set.
     *
     * @param {number} mask - The bits to be set.
     */
    set: function(mask) {
      this._bits = (mask == null) ? ~0 : (this._bits | mask);
    },

    /**
     * Clears a set of bits.
     *
     * If a `nully` argument is provided, all bits are cleared.
     *
     * @param {number} mask - The bits to be cleared.
     */
    clear: function(mask) {
      this._bits = (mask == null) ? 0 : (this._bits & ~mask);
    },

    /**
     * Returns a value that indicates if the current state is a subset of a given mask.
     *
     * Use this method to assert if no bits other than those described by the mask are
     * currently set.
     *
     * @param {!number} mask - An integer containing the bit mask to test.
     * @return {boolean} - `true` if the bits currently set are within the specified mask,
     * `false` otherwise.
     */
    isSubsetOf: function(mask){
      return (this._bits | mask) === mask;
    }

  });


});
