# Forms for user registration and login, including validation
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField
from wtforms.validators import DataRequired, Email, Length, EqualTo, ValidationError, Regexp
from .models import User  # Needed for duplicate checks

class RegistrationForm(FlaskForm):
    # Fields for registration
    email = StringField('Email', validators=[DataRequired(), Email(), Length(max=120)])
    username = StringField('Username', validators=[DataRequired(), Length(3, 20)])

    password = PasswordField('Password', validators=[
        DataRequired(),
        Length(min=8, max=30),
        Regexp(
            r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&^_-]).{8,30}$',
            message='Password must be 8–30 characters and include uppercase, lowercase, number, and special character.'
        )
    ])

    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')

    # Custom validator for email uniqueness
    def validate_email(self, email):
        if User.query.filter_by(email=email.data).first():
            raise ValidationError('Email already registered.')

    # Custom validator for username uniqueness
    def validate_username(self, username):
        if User.query.filter_by(username=username.data).first():
            raise ValidationError('Username already taken.')

class LoginForm(FlaskForm):
    # Login form fields
    username = StringField('Username', validators=[DataRequired(), Length(3, 20)])
    password = PasswordField('Password', validators=[DataRequired()])
    remember = BooleanField('Stay signed in?')
    submit = SubmitField('Login')

class PasswordResetRequestForm(FlaskForm):
    email = StringField('Email',
        validators=[DataRequired(), Email(), Length(max=120)])
    submit = SubmitField('Send Reset Link')

class ResetPasswordForm(FlaskForm):
    password = PasswordField('New Password', validators=[
        DataRequired(),
        Length(min=8, max=30),
        Regexp(
            r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&^_-]).{8,30}$',
            message='Password must be 8–30 characters and include uppercase, lowercase, number, and special character.'
        )
    ])
    confirm_password = PasswordField('Confirm Password',
        validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Reset Password')