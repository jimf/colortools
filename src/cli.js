module.exports = (argv, options) => {
    return Promise.resolve()
        .then(() => {
            options.writeStdout('Hello world');
            return 0;
        });
};
