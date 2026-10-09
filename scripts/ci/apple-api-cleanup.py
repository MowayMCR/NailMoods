import os,pathlib
(pathlib.Path.home()/'.appstoreconnect/private_keys'/('AuthKey_'+os.environ['APP_STORE_CONNECT_KEY_ID']+'.p8')).unlink(missing_ok=True)
