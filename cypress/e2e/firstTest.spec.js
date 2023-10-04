/// <reference types = "cypress"/>

describe('Test with backend', ()=> {

    beforeEach('login to the app', ()=> {
        cy.intercept({method: 'Get', path:'tags'},{fixture: 'tags.json'})
        cy.loginToApplication();    })

    it('verify correct request and response', ()=> {
        cy.intercept('POST', 'https://api.realworld.io/api/articles/').as('postArticles')

        cy.contains('New Article').click()
        cy.get('[formcontrolname="title"]').type('Title must be unique')
        cy.get('[formcontrolname="description"]').type('This is a description')
        cy.get('[formcontrolname="body"]').type('This is a body of the article')
        cy.contains('Publish Article').click()
        

        cy.wait('@postArticles').then(xhr => {
            console.log(xhr)
            expect(xhr.response.statusCode).to.equal(201)
            expect(xhr.request.body.article.title).to.equal('Title must be unique')
            expect(xhr.response.body.article.description).to.equal('This is a description')
        })
    })
    
    it('verify popular tags are displayed', ()=> {
        cy.get('.tag-list').should('contain', 'cypress')
        .and('contain', 'automation')
        .and('contain', 'testing')
    })

    it('verify global feeds likes count', ()=> {
        cy.intercept('GET', 'https://api.realworld.io/api/articles/feed*', '{"articles":[],"articlesCount":0}')
        cy.intercept('GET', 'https://api.realworld.io/api/articles*',{fixture: 'articles.json'})

        cy.contains('Global Feed').click()
        cy.get('app-article-list button').then(heartlist => {
            expect(heartlist[0]).to.contain('1')
            expect(heartlist[1]).to.contain('5')
        })

        cy.fixture('articles').then(file => {
            const articlesLink = file.articles[1].slug
            file.articles[1].favoritesCount = 6
            cy.intercept('POST','https://api.realworld.io/api/articles/'+articlesLink+'/favorite',file)
        })
        cy.get('app-article-list button').eq(1).click().should('contain', '6')
    })

    it('delete a new article in a global feed', ()=> {
       
        const bodyRequest = {
            "article": {
                "taglist": [],
                "title":"Requests from the API",
                "description":"API testing is easy",
                "body":"Angular is cool"
            }
        }
        cy.get('@token').then(token => {
            

            cy.request({
                url: 'https://api.realworld.io/api/articles/',
                headers: { 'Authorization': 'Token '+token},
                method: 'POST',
                body: bodyRequest
            }).then(response => {
                expect(response.status).to.equal(201)
            })

            cy.contains('Global Feed').click()
            cy.get('.article-preview').eq(0).click()
            cy.wait(3000)
            cy.get('.article-actions').contains('Delete Article')
        
            cy.request({
                url: 'https://api.realworld.io/api/articles?limit=10&offset=0',
                header:{Authorization: 'Token '+token},
                method:'GET'
            }).its('body').then(body=>{
                expect(body.articles[0].title).not.to.equal('Requests from the API')
            })
        })
    })

})