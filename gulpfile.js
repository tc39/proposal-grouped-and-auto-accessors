const del = require("del");
const path = require("path");
const gulp = require("gulp");
const emu = require("gulp-emu");
const rename = require("gulp-rename");
const gls = require("gulp-live-server");

const clean = () => del("docs/**/*");
gulp.task("clean", clean);

const build = () => gulp
    .src(["spec.emu"])
    .pipe(emu({
        log: require("ecmarkup/lib/utils").logVerbose,
        warn: err => {
            const file = path.resolve(err.file || "spec.emu");
            const message = `Warning: ${file}:${typeof err.line === "number" ? `${err.line}:${err.column}:` : ""} ${err.message}`;
            require("ecmarkup/lib/utils").logWarning(message)
        },
        ecma262Biblio: false,
    }))
    .pipe(rename("index.html"))
    .pipe(gulp.dest("."));
gulp.task("build", build);

const watch = () => gulp.watch(["spec.emu", "biblio.json", "ecma262biblio.json"], build);
gulp.task("watch", watch);

const serve = () => {
    const server = gls.static(".", 8080);
    const promise = server.start();
    (/** @type {import("chokidar").FSWatcher}*/(gulp.watch(["index.html"])))
        .on("change", file => {
            server.notify({ path: path.resolve(file) });
        });
    return promise;
};
gulp.task("start", gulp.parallel(watch, serve));
gulp.task("default", build);