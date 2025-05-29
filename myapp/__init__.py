# Initializes the Flask app and connects components (DB, login manager, routes)
from flask import Flask
from .extensions import db, bcrypt, login_manager, migrate  # Shared extensions
from .models import User  # Needed for DB table creation
from .routes import init_routes  # Registers all routes

def create_app():
    app = Flask(__name__)
    
    # Configurations
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///yourdatabase.db'  # DB path
    app.config['SECRET_KEY'] = '2185...'  # Needed for secure sessions/forms

    # Initialise extensions with app context
    db.init_app(app)  # Attach database
    migrate.init_app(app, db) 
    bcrypt.init_app(app)  # Attach password hashing
    login_manager.init_app(app)  # Attach login manager
    login_manager.login_view = 'login'  # Redirect to 'login' for @login_required

    with app.app_context():
        db.create_all()  # Create tables from models (e.g. User)

    init_routes(app)  # Attach route handlers
    return app
