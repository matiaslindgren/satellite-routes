(ns satellite-routes.utils.algorithm)

(defn polyhedron-coordinates
  " Returns a map of cartesian coordinates for polyhedron vertices on the
    surface of a sphere of radius R. If the polyhedron-name is not found, return nil. "
  ;Some polyhedrons have 2 orientation sets, they are not available here.
  [R polyhedron-name]
  (let [gr (/ (+ 1 (Math/sqrt 5)) 2) ;Golden ratio
        a (case polyhedron-name 
            ;Awful heuristic inspired by Wikipedia to find a scaling factor for placing 
            ;polyhedron vertices on the surface of the sphere.
            ;It is probably possible to derive the value of a only by using 
            ;Schläfli symbols.
            "tetrahedron" (/ R (Math/sqrt 3))
            "cube" (/ R (Math/sqrt 3))
            "octahedron" R
            "dodecahedron" (/ R (Math/sqrt 3))
            "icosahedron" (/ R (* gr (* 2 (Math/sin (/ Math/PI 5))))) ;ugh..
            "default" 0)
        -a (- a)
        gr-inv (/ gr)
        b (* a gr)
        -b (- b)
        c (/ a gr)
        -c (- c)]
    (case polyhedron-name
      ;Cartesian coordinate sets for polyhedron vertices of polyhedrons located
      ;at the origin.
      "tetrahedron" (for [x [-a a] y [-a a] z [-a a]
                          :when (or (= a x y z)
                                    (>= x 0 y z)
                                    (>= y 0 x z)
                                    (>= z 0 x y))]
                      [x y z])
      "cube"        (for [x [-a a] y [-a a] z [-a a]]
                      [x y z])
      "octahedron"  (for [x [-a 0 a] y [-a 0 a] z [-a 0 a]
                          :when (and (not= x y z 0)
                                     (or (= 0 y z)
                                         (= 0 x z)
                                         (= 0 x y)))]
                      [x y z])

      "icosahedron"  (for [x [-a -b 0 a b] 
                           y [-a -b 0 a b]
                           z [-a -b 0 a b]
                           :when (or (and (= 0 x)
                                          (= (Math/abs y) a)
                                          (= (Math/abs z) b))
                                     (and (= 0 y)
                                          (= (Math/abs x) b)
                                          (= (Math/abs z) a))
                                     (and (= 0 z)
                                          (= (Math/abs x) a)
                                          (= (Math/abs y) b)))]
                       [x y z])
      "dodecahedron"  (concat (for [x [-a a] y [-a a] z [-a a]] [x y z])
                              (for [x [-b -c 0 b c]
                                    y [-b -c 0 b c]
                                    z [-b -c 0 b c]
                                    :when (or (and (= 0 x)
                                                   (= (Math/abs y) c)
                                                   (= (Math/abs z) b))
                                              (and (= 0 y)
                                                   (= (Math/abs x) b)
                                                   (= (Math/abs z) c))
                                              (and (= 0 z)
                                                   (= (Math/abs x) c)
                                                   (= (Math/abs y) b)))]
                                [x y z]))
      "default" [])))


(defn truncate-zero
  " If the absolute value of the parameter x is less than 1e-9, 
  return 0.0, else return the parameter. "
  [x]
  (if (< (Math/abs x) 1E-9)
    0.0
    x))

(defn as-cartesian
  " Return a vector [x y z] from the geographic coordinates 
  [r latitude longitude] given as parameters. "
  [r latitude longitude]
  (let [phi (Math/toRadians latitude)
        theta (Math/toRadians longitude)]
    (vec (map truncate-zero
              [(* r (Math/cos theta) (Math/cos phi))
               (* r (Math/sin theta) (Math/cos phi))
               (* r (Math/sin phi))]))))

(defn euclidian-distance
  [[x1 y1 z1]
   [x2 y2 z2]]
  (let [dx (- x2 x1)
        dy (- y2 y1)
        dz (- z2 z1)
        xx (* dx dx)
        yy (* dy dy)
        zz (* dz dz)]
    (Math/sqrt (+ xx yy zz))))

(defn unobstructed-distance
  " Returns the distance between positions a and b if they have contact, else -1.
    Basically calculates if the line segment from position a to position b intersects a sphere, of a certain radius, centered at the origin. "
  [a-pos b-pos radius]
  (let [[x1 y1 z1] a-pos
        [x2 y2 z2] b-pos
        dx (- x2 x1)
        dy (- y2 y1)
        dz (- z2 z1)
        a (+ (* dx dx)
             (* dy dy)
             (* dz dz))
        b (* 2
             (+ (* x1 dx)
                (* y1 dy)
                (* z1 dz)))
        c (- (+ (* x1 x1)
                (* y1 y1)
                (* z1 z1))
             (* radius radius))
        sqrt-expression (- (* b b)
                           (* 4 a c))]
    (if (and (> sqrt-expression 0) ; true if there's an intersection somewhere
             (let [xdx (* (- 0 x1) dx) ; check if intersection is between positions a and b
                   ydy (* (- 0 y1) dy)
                   zdz (* (- 0 z1) dz)
                   dividend (+ xdx ydy zdz)]
               (< 0 (/ dividend a) 1)))
      -1
      (euclidian-distance a-pos b-pos))))

