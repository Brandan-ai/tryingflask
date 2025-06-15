from myapp import create_app  # adjust 'myapp' if your folder is named differently

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
