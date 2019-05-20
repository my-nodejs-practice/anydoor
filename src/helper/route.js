const fs = require('fs');
const path = require('path');
const promisify = require('util').promisify;
const Handlebars = require('handlebars');
const config = require('../config/default_config');
const mime = require('./mime');
const compress = require('./compress');

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

const source = fs.readFileSync(path.join(__dirname, '../tpl/dir.tpl'));
const tpl = Handlebars.compile(source.toString());

module.exports = async function({ req, res, filePath }) {
  try {
    const stats = await stat(filePath);
    if (stats.isFile()) {
      res.statusCode = 200;
      res.setHeader('Content-Type', mime.getMimeType(filePath));
      let rs = fs.createReadStream(filePath);
      if (filePath.match(config.compress)) {
        rs = compress(rs, req, res);
      }
      rs.pipe(res);
    } else if (stats.isDirectory()) {
      const files = await readdir(filePath);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      let dir = path.relative(config.root, filePath);
      dir = dir ? `/${dir}` : '';
      const data = {
        title: path.basename(filePath),
        dir: dir,
        files: files.map(file => {
          return {
            file,
            icon: mime.getFileIcon(file)
          };
        })
      };
      res.end(tpl(data));
    }
  } catch (err) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`${filePath} is not a directory or file.`);
  }
};
