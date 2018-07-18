const express = require ('express');
const passport = require ('passport');
const recipeRoutes = express.Router();
const Recipe = require('../models/Recipe');
const Comment = require('../models/Comment');
const uploadCloud = require('../config/cloudinary');
const axios = require('axios');
const {ensureLoggedIn} = require('../middleware/ensureLogin');

recipeRoutes.get('/addRecipe', ensureLoggedIn("/auth/informs"), (req, res, next) => {
  res.render('recipes/newRecipe');
})


recipeRoutes.post('/addRecipe', uploadCloud.single('photo'), (req, res, next) => {
  const {name, elaborationTime, category, } = req.body;
  const ingredients = [];
  const ingredient = req.body.ingredient;
  const quantity = req.body.quantity;
  if (typeof ingredient == Object){

    ingredient.filter((e)=>e!="");
    quantity.filter((e)=>e!="");
    for (let i=0; i<ingredient.length; i++){
      ingredients.push(quantity[i]+' '+ingredient[i]);
    }
  }else{
    ingredients.push(quantity+' '+ingredient);
  }
  const steps = req.body.step;
  if (typeof steps == Object){steps.filter((e)=>e!="");}
  const keywords = req.body.keyword;
  if (typeof keywords == Object){keywords.filter((e)=>e!="");}
  const path = req.file.secure_url;
  const originalName = req.file.original_name;
  axios.get('https://api.punkapi.com/v2/beers/random')
  .then((beer) =>{
    createRecipes(beer);
  })
  .catch((err) =>{
    createRecipe();
    console.log(err);
  })

  function createRecipe(beer){
    const recipeBeers = [];
    recipeBeers.push(beer);
    newRecipe = new Recipe({
      name: name.toUpperCase(),
      ingredients,
      steps,
      elaborationTime,
      category,
      keywords,
      recipeBeers,
      authorId: req.user._id,
      recipePic: {path, originalName}
    })

    newRecipe.save()
      .then(()=>{

        res.redirect("/auth/profile")
      })
      .catch((err)=>{
        console.log(err);
        res.render('recipes/newRecipe', {message: "something went wrong"})
      })
 
  }
});

recipeRoutes.get('/oneRecipe/:id', ensureLoggedIn("/auth/informs"), (req, res, next) => {
  Recipe.findById(req.params.id)
    .populate('authorId', 'username')
    .then((recipe) =>{
      Comment.find({recipeId: recipe._id})
        .populate('authorId')
        .then((comments) => {
          res.render('recipes/oneRecipe', {user:req.user, recipe, comments});
        })
    })
})

recipeRoutes.post('/addComment/:id', (req, res, next) => {

  const authorId = req.user._id;
  const content = req.body.message;
  const recipeId = req.params.id;
  const newComment = new Comment({authorId, content, recipeId});

  newComment.save()
    .then((comment)=>{
      console.log("Comment inserted properly");
      res.redirect(`/recipes/oneRecipe/${recipeId}`);
    })
    .catch((error) =>{
      console.log(error);
    })
})

recipeRoutes.post("/search", (req,res,next)=>{
  console.log(req.body.search);
  Recipe.find({$or: [{keywords: [req.body.search]}, {name: new RegExp(req.body.search.toUpperCase())}]})
    .then((recipes) => {
      console.log(recipes)
      res.render("index", {user:req.user, recipes})
    })
    .catch((err) => {
      console.log(err);
    })
});
module.exports = recipeRoutes;
