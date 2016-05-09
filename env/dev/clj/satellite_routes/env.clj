(ns satellite-routes.env
  (:require [selmer.parser :as parser]
            [clojure.tools.logging :as log]
            [satellite-routes.dev-middleware :refer [wrap-dev]]))

(def defaults
  {:init
   (fn []
     (parser/cache-off!)
     (log/info "\n-=[satellite-routes started successfully using the development profile]=-"))
   :stop
   (fn []
     (log/info "\n-=[satellite-routes has shutdown successfully]=-"))
   :middleware wrap-dev})
