exports.hasProperty = (obj, property) =>
    Object.prototype.hasOwnProperty.call(obj, property);

/**
 * Zip two arrays together, using a given function to perform the joins.
 * Result will have the same length as the longer of the two given array.
 *
 * @param {*[]} xs First array
 * @param {*[]} ys Second array
 * @return {*[]} Joined array
 */
exports.zipWith = (xs, ys, f) => {
    const result = new Array(Math.max(xs.length, ys.length));

    for (let i = 0; i < result.length; i += 1) {
        result[i] = f(xs[i], ys[i]);
    }

    return result;
};
