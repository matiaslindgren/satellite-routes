(ns satellite-routes.doo-runner
  (:require [doo.runner :refer-macros [doo-tests]]
            [satellite-routes.core-test]))

(doo-tests 'satellite-routes.core-test)

