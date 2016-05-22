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

function one() {
  two();
}

function other_one() {
  two();
}

function two() {
  one();
}

function recursive() {
  level_three();
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

var other_obj = {
  reference: referenced_function
};

function referenced_function(some_value) {
  _(some_value)
    .map(function (value) {
      return value * 2;
    })
    .reduce(function (sum, value) {
      return sum + value;
    }, 0)
    .value();
}

function angularService($http) {
  var self = this;
  _.extend(self, {
    getGenres: getGenres,
    subsonicRequest: subsonicRequest
  });

  function getGenres() {
    self.subsonicRequest();
  }

  function subsonicRequest() {
  }
}

function does_not_depend_and_is_not_depended_upon(b) {
  return b * 2;
}
