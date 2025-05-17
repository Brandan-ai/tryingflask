# routes.py

from flask import render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from .forms import RegistrationForm, LoginForm
from .extensions import db, login_manager

def init_routes(app):
    from .models import User  # Deferred import to avoid circular dependency

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # ── Suppress Flask-Login's default flash messages ──
    login_manager.login_view = 'login'
    login_manager.login_message = None
    login_manager.needs_refresh_message = None

    @app.route('/register', methods=['GET', 'POST'])
    def register():
        if current_user.is_authenticated:
            return redirect(url_for('home'))

        form = RegistrationForm()
        if form.validate_on_submit():
            user = User(username=form.username.data, email=form.email.data)
            user.set_password(form.password.data)
            db.session.add(user)
            db.session.commit()
            flash('Account created!', 'success')
            return redirect(url_for('login'))

        if form.is_submitted() and form.errors:
            for field, errors in form.errors.items():
                label = getattr(form, field).label.text
                for err in errors:
                    flash(f"{label}: {err}", 'error')

        return render_template('register.html', form=form)

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if current_user.is_authenticated:
            return redirect(url_for('home'))

        form = LoginForm()
        if form.validate_on_submit():
            user = User.query.filter_by(username=form.username.data).first()
            if user and user.check_password(form.password.data):
                login_user(user)
                return redirect(url_for('home'))
            flash('Invalid credentials.', 'error')

        return render_template('login.html', form=form)

    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        return redirect(url_for('login'))

    @app.route('/')
    @login_required
    def home():
        return render_template('home.html')
