from app import create_app

app = create_app()

if __name__ == '__main__':
    # host="0.0.0.0" expone la API a tu red local (192.168.100.99)
    app.run(host="0.0.0.0", port=5000, debug=True)
