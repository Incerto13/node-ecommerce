FROM mongo

COPY orders_init.json products_init.json users_init.json ./
#  mongoimport --host <host_name> --username <user_name> --password <password> --db <database_name> --collection <collection_name> --file <input_file>
CMD mongoimport --host db --db nodeEcommerce --collection orders --type json --file /orders_init.json --jsonArray \
&& mongoimport --host db --db nodeEcommerce --collection products --type json --file /products_init.json --jsonArray \
&& mongoimport --host db --db nodeEcommerce --collection users --type json --file /users_init.json --jsonArray
