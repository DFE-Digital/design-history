const express = require('express')
const nunjucks = require('nunjucks')
const https = require('https')
const axios = require('axios')
var dateFilter = require('nunjucks-date-filter')
var markdown = require('nunjucks-markdown')
var marked = require('marked')
const bodyParser = require('body-parser')
var NotifyClient = require('notifications-node-client').NotifyClient

require('dotenv').config()
const app = express()

const notify = new NotifyClient(process.env.notifyKey)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.set('view engine', 'html')

app.locals.serviceName = 'Design histories'
app.locals.BASE_URL = process.env.BASE_URL;

// Set up Nunjucks as the template engine
var nunjuckEnv = nunjucks.configure(
  [
    'app/views',
    'node_modules/govuk-frontend/dist/',
    'node_modules/dfe-frontend-alpha/packages/components',
  ],
  {
    autoescape: true,
    express: app,
  },
)

nunjuckEnv.addFilter('date', dateFilter)
markdown.register(nunjuckEnv, marked.parse)

nunjuckEnv.addFilter('truncateAtFullStop', truncateAtFullStop);

// Set up static file serving for the app's assets
app.use('/assets', express.static('public/assets'))

// Render sitemap.xml in XML format
app.get('/sitemap.xml', (_, res) => {
  res.set({ 'Content-Type': 'application/xml' });
  res.render('sitemap.xml');
});

app.get('/accessibility-statement', (_, res) => {
  res.render('accessibility-statement');
});


app.get('/search', async (req, res) => {
  const searchTerm = req.query['searchterm'] || ''
  let results = [];

  if (searchTerm) { // Only query Strapi if a search term was provided
    try {
      // Query Strapi for posts and services with matching titles

      var posts = {
        method: 'get',
        url: `${process.env.cmsurl}api/posts?_q=${searchTerm}&populate=%2A`,
        headers: {
          Authorization: 'Bearer ' + process.env.apikey,
        },
      }
  
        axios(posts)
          .then(function (responses) {
            var results = responses.data
  
            res.render('search.html', { searchTerm, results })
          })
          .catch(function (error) {
            console.log(error)
          })
      
    

    } catch(err){
      console.log(err)
        // Render the search results template with the matching results
  res.render('search.html', { searchTerm, results });
    }
  }


});

app.get('/start-design-history', (req, res) => {
  return res.render('start-design-history')
})

app.get('/guidance', (req, res) => { 
  return res.render('guidance')
})

app.post('/start-design-history', (req, res) => {
  const email = req.body.email
  const name = req.body.name

  //Send to notify after validation with recaptcha first
  //TODO: Implement recaptcha

  notify
    .sendEmail(process.env.designHistoryRequest, 'design.ops@education.gov.uk', {
      personalisation: {
        email: email,
        name: name,
      },
    })
    .then((response) => {})
    .catch((err) => console.log(err))

  return res.redirect('/requested')
})

app.get('/requested', (req, res) => {
 
  return res.render('requested.html')
})


app.post('/submit-feedback', (req, res) => {
  const feedback = req.body.feedback_form_input
  const fullUrl = req.headers.referer || 'Unknown'

  //Send to notify after validation with recaptcha first
  //TODO: Implement recaptcha

  notify
    .sendEmail(process.env.feedbackTemplateID, 'design.ops@education.gov.uk', {
      personalisation: {
        feedback: feedback,
        page: fullUrl,
        service: "Design Histories"
      },
    })
    .then((response) => {})
    .catch((err) => console.log(err))

  return res.sendStatus(200)
})


app.get('/', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/teams?filters[Enabled][\$eq]=true&sort=Title&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var services = {
    method: 'get',
    url: `${process.env.cmsurl}api/services?sort=Title&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var posts = {
    method: 'get',
    url: `${process.env.cmsurl}api/posts?sort=Publication_date%3Adesc&pagination[limit]=6&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }
  var postsolder = {
    method: 'get',
    url: `${process.env.cmsurl}api/posts?sort=Publication_date%3Adesc&pagination[start]=7&pagination[limit]=6&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }



  var tags = {
    method: 'get',
    url: `${process.env.cmsurl}api/tags?sort=Tag&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  axios(config)
    .then(function (response) {
      var teams = response.data

      axios(services)
        .then(function (responses) {
          var services = responses.data

          axios(posts)
            .then(function (response) {
              var posts = response.data

              axios(tags)
                .then(function (response) {
                  var tags = response.data


                  axios(postsolder)
                  .then(function (response) {
                    var postsolder = response.data
  
  
  
                    res.render('index', { teams, services, posts, tags, postsolder })
  
                    
                  })
                  .catch(function (error) {
                    console.log(error)
                  })


                })
                .catch(function (error) {
                  console.log(error)
                })
            })
            .catch(function (error) {
              console.log(error)
            })
        })
        .catch(function (error) {
          console.log(error)
        })
    })
    .catch(function (error) {
      console.log(error)
    })
})

app.get('/teams', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/teams?filters[Enabled][\$eq]=true&sort=Title&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var services = {
    method: 'get',
    url: `${process.env.cmsurl}api/services?sort=Title&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var posts = {
    method: 'get',
    url: `${process.env.cmsurl}api/posts?sort=Publication_date%3Adesc&pagination[limit]=5&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var tags = {
    method: 'get',
    url: `${process.env.cmsurl}api/tags?sort=Tag&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  axios(config)
    .then(function (response) {
      var teams = response.data

      axios(services)
        .then(function (responses) {
          var services = responses.data

          axios(posts)
            .then(function (response) {
              var posts = response.data

              axios(tags)
                .then(function (response) {
                  var tags = response.data

                  res.render('teams', { teams, services, posts, tags })
                })
                .catch(function (error) {
                  console.log(error)
                })
            })
            .catch(function (error) {
              console.log(error)
            })
        })
        .catch(function (error) {
          console.log(error)
        })
    })
    .catch(function (error) {
      console.log(error)
    })
})

app.get('/team/:id', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/teams?filters[slug][\$eq]=${req.params.id}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  axios(config)
    .then(function (response) {
      var services = response.data

      console.log(services)

      res.render('team.html', { services })
    })
    .catch(function (error) {
      console.log(error)
    })
})

app.get('/tag/:id', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/posts?filters[tags][slug][\$eq]=${req.params.id}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var tag = {
    method: 'get',
    url: `${process.env.cmsurl}api/tags?filters[slug][\$eq]=${req.params.id}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var tags = {
    method: 'get',
    url: `${process.env.cmsurl}api/tags?sort=Tag&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  //    url: `${process.env.cmsurl}api/posts?filters[slug][\$eq]=${req.params.post_slug}&[service][slug][\$eq]=${req.params.service_slug}&populate=%2A`,

  axios(config)
    .then(function (response) {
      var posts = response.data

      axios(tag)
      .then(function (response) {
        var tag = response.data
      
        axios(tags)
        .then(function (response) {
          var tags = response.data
    
          res.render('tags', { posts, tag, tags })
        })
        .catch(function (error) {
          console.log(error)
        })
      })
      .catch(function (error) {
        console.log(error)
      })

    })
    .catch(function (error) {
      console.log(error)
    })
})



app.get('/:service_slug/:post_slug', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/posts?filters[slug][\$eq]=${req.params.post_slug}&[service][slug][\$eq]=${req.params.service_slug}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var service = {
    method: 'get',
    url: `${process.env.cmsurl}api/services?filters[slug][\$eq]=${req.params.service_slug}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  axios(config)
    .then(function (response) {
      var data = response.data

      axios(service)
        .then(function (responses) {
          var services = responses.data

          res.render('post.html', { data, services })
        })
        .catch(function (error) {
          console.log(error)
        })
    })
    .catch(function (error) {
      console.log(error)
    })
})


app.get('/:id', function (req, res) {
  var config = {
    method: 'get',
    url: `${process.env.cmsurl}api/posts?filters[service][slug][\$eq]=${req.params.id}&pagination[start]=0&pagination[limit]=100&sort=Publication_date%3Adesc&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  var service = {
    method: 'get',
    url: `${process.env.cmsurl}api/services?filters[slug][\$eq]=${req.params.id}&populate=%2A`,
    headers: {
      Authorization: 'Bearer ' + process.env.apikey,
    },
  }

  axios(config)
    .then(function (response) {
      var posts = response.data

      axios(service)
        .then(function (responses) {
          var services = responses.data

          res.render('service.html', { posts, services })
        })
        .catch(function (error) {
          console.log(error)
        })
    })
    .catch(function (error) {
      console.log(error)
    })
})







app.get(/\.html?$/i, function (req, res) {
  var path = req.path
  var parts = path.split('.')
  parts.pop()
  path = parts.join('.')
  res.redirect(path)
})

app.get(/^([^.]+)$/, function (req, res, next) {
  matchRoutes(req, res, next)
})

// Handle 404 errors
app.use(function (req, res, next) {
  res.status(404).render('error.html')
})

// Handle 500 errors
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).render('error.html')
})

// Try to match a request to a template, for example a request for /test
// would look for /app/views/test.html
// and /app/views/test/index.html

function renderPath(path, res, next) {
  // Try to render the path
  res.render(path, function (error, html) {
    if (!error) {
      // Success - send the response
      res.set({ 'Content-type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }
    if (!error.message.startsWith('template not found')) {
      // We got an error other than template not found - call next with the error
      next(error)
      return
    }
    if (!path.endsWith('/index')) {
      // Maybe it's a folder - try to render [path]/index.html
      renderPath(path + '/index', res, next)
      return
    }
    // We got template not found both times - call next to trigger the 404 page
    next()
  })
}

matchRoutes = function (req, res, next) {
  var path = req.path

  // Remove the first slash, render won't work with it
  path = path.substr(1)

  // If it's blank, render the root index
  if (path === '') {
    path = 'index'
  }

  renderPath(path, res, next)
}


function truncateAtFullStop(inputString) {
  const fullStopIndex = inputString.indexOf('.');
  if (fullStopIndex === -1) {
    return inputString;
  }
  return inputString.substring(0, fullStopIndex + 1);
}


app.listen(process.env.PORT || 3088)
