(ns satellite-routes.utils.algorithm)


(defn truncate-zero
  " If the absolute value of the parameter x is less than 1e-9, return 0.0, else return the parameter "
  [x]
  (if (< (Math/abs x) 1E-9)
    0.0
    x))

(defn as-cartesian
  " Return a vector [x y z] from the geographic coordinates [r latitude longitude] given as parameters "
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

