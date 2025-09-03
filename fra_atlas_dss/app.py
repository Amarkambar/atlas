from flask import Flask, send_from_directory, render_template_string
import os

app = Flask(__name__, static_folder='fra_atlas_dss')

# Serve index.html at root
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# Serve pages from fra_atlas_dss/pages
@app.route('/pages/<path:filename>')
def pages(filename):
    return send_from_directory(os.path.join(app.static_folder, 'pages'), filename)

# Serve css files
@app.route('/css/<path:filename>')
def css(filename):
    return send_from_directory(os.path.join(app.static_folder, 'css'), filename)

# Serve public files
@app.route('/public/<path:filename>')
def public(filename):
    return send_from_directory(os.path.join(app.static_folder, 'public'), filename)

if __name__ == '__main__':
    app.run(host='localhost', port=8000, debug=True)
