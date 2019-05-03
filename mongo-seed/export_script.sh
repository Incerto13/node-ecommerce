#!/bin/sh

mongoexport --db nodeEcommerce --collection orders  --jsonArray --out orders_init.json
mongoexport --db nodeEcommerce --collection products  --jsonArray --out products_init.json
mongoexport --db nodeEcommerce --collection users  --jsonArray --out users_init.json
