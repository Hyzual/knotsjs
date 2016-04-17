function level_one() {
  level_two();
  another_level_two();
}

function level_two() {
  level_three();
}

function another_level_two() {
  level_three();
}

function level_three() {

}

function zbra() {
  a();
}

var obj = {
  yolo: function() {
    b();
  },
  outer_name: function inner_name() {
    c();
  }
};

function recursive() {
  recursive();
}

function circular_one() {
  circular_two();
}

function circular_two() {
  circular_three();
}

function circular_three() {
  circular_one();
}
