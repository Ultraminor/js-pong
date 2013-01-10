//Main source file for Javascript Pong
//Copyright 2013 Adam Richardson
//Distributed under the GNU General Public License

//Conventions:
//	UpperCamelCase for functions and constants
//	lowerCamelCase for variables

//Scaling stuff
	var pongContainer;
	var FieldRatio	= 640 / 480;
	var
		lastWidth = 640,
		lastHeight = 480;

//Milliseconds per frame
	var FrameTime	= 40;

//Field dimensions
	var
		FieldWidth	= 640,
		FieldHeight	= 480;

//Ball-related constants and variables
	//Ball coordinates and speed
	var
		ballX,
		ballY,
		ballXSpeed,	//Speed along the x axis
		ballYSpeed,	//Speed along the y axis
		BallLaunchSpeed = 15;	//Overall speed at launch
	//Ball size (px)
	var BallSize	= 30;
	//The speed boost gained by the ball with each paddle hit
	var BallHitBoost	= 1
	;
	//Ball point of origin, pre-launch
	var
		BallXOrigin	= ( FieldWidth - BallSize ) / 2,
		BallYOrigin	= ( FieldHeight - BallSize ) / 2;
	
//Paddle-related constants and variables
	//Paddle length and thickness
	var
		PaddleLength	= 100,
		PaddleThickness	= 14;
	//Speed of paddle vertical motion (pixels per frame)
	var PaddleStride	= 10;
	//Initial y coordinate for paddle
	var PaddleYOrigin	= ( FieldHeight - PaddleLength ) / 2;
	//Offset of paddles from vertical walls
	var PaddleXOffset	= 15;
	//(Minimum) offset of paddles from horizontal walls
	var PaddleYOffset	= 15;
	//x coordinates for the human-/computer-controlled paddle surfaces
	var
		PlayerPaddleSurface		= PaddleXOffset + PaddleThickness,
		ComputerPaddleSurface	= FieldWidth - PaddleXOffset - PaddleThickness;
	//y coordinates for each paddle
	var
		playerPaddleY,
		computerPaddleY;

//Key constants
	var
		UpKey		= 38,	//Up arrow
		DownKey		= 40,	//Down arrow
		PauseKey	= "P".charCodeAt( ),
		LaunchKey	= " ".charCodeAt( );

//Interface variables
	var
		upKeyPressed = false,
		downKeyPressed = false,
		launchKeyPressed = false;

//AI 'tightness' - the closeness with which the AI follows the ball
	var AITolerance	= 20;

//Game pause flag
	var gamePaused = false;
	
//Imminent death flag - allows for the ball to actually hit the rear walls before being reset
	var deathImminent = false;

//Handles to the DOM objects
	var
		field,
		playerPaddle,
		computerPaddle,
		ball,
		line,
		playerScore,
		computerScore;

//Warp constants
	var
		WarpRange	= Math.PI / 10,
		MotionWarp	= Math.PI / 16;

//Converts a number to a CSS-ready pixel value
function Pixels( n )
{
	return n.toString( ) + "px";
}

//Spawns and runs a Pong game within a given container element
function SpawnPong( container )
{	
	//Create the playing field
	field = document.createElement( "div" );
	field.setAttribute( "id", "playingField" );
	field.setAttribute( "class", "box" );
	field.setAttribute( "tabindex", "0" );
	PositionField( );
	
	//Paint the center line
	line = document.createElement( "div" );
	line.setAttribute( "class", "box line" );
	PositionLine( );
	field.appendChild( line );
	
	//Create the human paddle
	playerPaddle = document.createElement( "div" );
	playerPaddle.setAttribute( "class", "solidBox" );
	playerPaddleY = PaddleYOrigin;
	field.appendChild( playerPaddle );
	
	//Create the computer paddle
	computerPaddle = document.createElement( "div" );
	computerPaddle.setAttribute( "class", "solidBox" );
	computerPaddleY = PaddleYOrigin;
	field.appendChild( computerPaddle );
	
	//Position the paddles on-screen
	PositionPaddles( );
	RenderPaddles( );
	
	//Create the ball
	ball = document.createElement( "div" );
	ball.setAttribute( "class", "solidBox" );
	PositionBall( );
	ResetBall( );
	field.appendChild( ball );
	
	var elem;
	
	//Create the player score display
	elem = document.createElement( "div" );
	elem.setAttribute( "class", "pScore" );
	field.appendChild( elem );
	playerScore = document.createElement( "p" );
	playerScore.innerHTML = "0";
	elem.appendChild( playerScore );
	
	//Create the computer score display
	elem = document.createElement( "div" );
	elem.setAttribute( "class", "cScore" );
	field.appendChild( elem );
	computerScore = document.createElement( "p" );
	computerScore.innerHTML = "0";
	elem.appendChild( computerScore );
	
	//Push the field onto the document
	container.appendChild( field );
	
	//Attach the field mouse handlers
	field.onmousedown = HandleMouseClick;
	field.onmousemove = HandleMouseMove;
	
	//Attach the field key handlers
	field.onkeydown = function( e ) { HandleKeys( e, true ); };
	field.onkeyup = function( e ) { HandleKeys( e, false ); };
	
	//Scale the field
	pongContainer = container;	//Stash the container variable
	//Store the default dimensions (+2 for borders)
	lastContainerWidth = FieldWidth + 2;
	lastContainerHeight = FieldHeight + 2;
	TryScale( );	//This function also handles some rendering jobs
	
	//Give focus to the game
	field.focus( );
	
	//Run the game
	RunPong( );
}

//Stops and destroys the Pong game
function DestroyPong( )
{
	field.parentNode.removeChild( field );
}

//Pong game loop function
function RunPong( )
{
	//Handle scaling
	TryScale( );
	
	//Assuming minimal lag, this function should run once per FrameTime interval
	setTimeout( RunPong, FrameTime );
	
	//Do nothing if game is paused
	if( gamePaused )
		return;
	
	//Handle goals via deathImminent
	if( deathImminent )
	{
		//If the ball is on the left side, it's a goal for the computer
		if( ballX < FieldWidth / 2 )
			computerScore.innerHTML = ( parseInt( computerScore.innerHTML ) + 1 ).toString( );
		else	//Otherwise it's a goal for the player
			playerScore.innerHTML = ( parseInt( playerScore.innerHTML ) + 1 ).toString( );
			
		ResetBall( );
	}

	//Handle paddle movement
	
	//Human paddle:
	if( upKeyPressed ^ downKeyPressed )	//Only move if one key is pressed, but not both
	{
		if( upKeyPressed )
		{
			//If we have space to move up,
			if( playerPaddleY > PaddleYOffset )
				playerPaddleY -= PaddleStride;	//Move the paddle up
		}
		else //if( downKeyPressed )
		{
			//If we have space to move down,
			if( playerPaddleY + PaddleLength < FieldHeight - PaddleYOffset )
				playerPaddleY += PaddleStride;	//Move the paddle down
		}
	}
	
	//Computer paddle:
	var aiDirection = ComputerPaddleAI( );
	if( aiDirection < 0 )
	{
		//If we have space, move up
		if( computerPaddleY > PaddleYOffset )
			computerPaddleY -= PaddleStride;		
	}
	else if( aiDirection > 0 )
	{
		//If we have space, move down
		if( computerPaddleY + PaddleLength < FieldHeight - PaddleYOffset )
			computerPaddleY += PaddleStride;
	}
	
	//Update the paddles on-screen
	RenderPaddles( );
	
	//Move the ball
	ballX += ballXSpeed;
	ballY += ballYSpeed;
	
	//Bounce the ball of the horizontal walls
	if( ballY < 0 )
	{
		ballY = 0;
		ballYSpeed = - ballYSpeed;
	}
	else if( ballY + BallSize > FieldHeight )
	{
		ballY = FieldHeight - BallSize;
		ballYSpeed = - ballYSpeed;
	}
	
	//Bounce the ball off the paddles
	
	//Player paddle
	if( ballX < PlayerPaddleSurface )
	{
		if( ballY + BallSize > playerPaddleY && ballY < playerPaddleY + PaddleLength )
		{
			ballXSpeed = - ballXSpeed;
			ballX = PlayerPaddleSurface;
			WarpBall( playerPaddleY, ( upKeyPressed ^ downKeyPressed ) ? ( upKeyPressed ? - 1 : 1 ) : 0 );
		}
	}
	else if( ballX + BallSize > ComputerPaddleSurface )	//Computer paddle
	{
		if( ballY + BallSize > computerPaddleY && ballY < computerPaddleY + PaddleLength )
		{
			ballXSpeed = - ballXSpeed;
			ballX = ComputerPaddleSurface - BallSize;
			WarpBall( computerPaddleY, aiDirection );
		}
	}
	
	//Handle hits on the rear walls
	if( ballX < 0 )
	{
		//Hit on player wall
		ballX = 0;
		deathImminent = true;
	}
	else if( ballX + BallSize > FieldWidth )
	{
		//Hit on computer wall
		ballX = FieldWidth - BallSize;
		deathImminent = true;
	}
	
	//Render the ball
	RenderBall( );
}

//Freezes the ball and places it at center
function ResetBall( )
{
	ballXSpeed = ballYSpeed = 0;
	
	ballX = BallXOrigin;
	ballY = BallYOrigin;
	
	deathImminent = false;
}

//Sets the ball into motion
function TryLaunchBall( )
{
	//Don't launch if the ball is already in motion, or if the game is paused
	if( ballXSpeed || ballYSpeed || gamePaused )
		return;
	
	//Generate x velocity - at least half of the max
	ballXSpeed = Randrange( BallLaunchSpeed / 2, BallLaunchSpeed + 1 );
	
	//Calculate y velocity
	ballYSpeed = Math.sqrt( BallLaunchSpeed * BallLaunchSpeed - ballXSpeed * ballXSpeed );
	
	//Possibly negate x/y velocities
	if( Randrange( 0, 2 ) ) ballXSpeed = - ballXSpeed;
	if( Randrange( 0, 2 ) ) ballYSpeed = - ballYSpeed;
}

//Shifts the ball element to match the internal coordinates
function RenderBall( )
{
	ball.style.left = Pixels( ballX );
	ball.style.top = Pixels( ballY );
}

//Shifts the paddle elements to match the internal coordinates
function RenderPaddles( )
{
	playerPaddle.style.top = Pixels( playerPaddleY );
	computerPaddle.style.top = Pixels( computerPaddleY );
}

//Handler for clicks on field
function HandleMouseClick( event )
{	
	//Safety catch for IE
	if( ! event )
		var event = window.event;
	
	//Focus the playing field (although this has probably already been done in HandleMouseMove)
	field.focus( );
	
	//If the ball isn't moving, we take this as a launch instruction
	//Otherwise, we pause/unpause

	if( ballXSpeed || ballYSpeed )
		TryTogglePause( );
	else
		TryLaunchBall( );
}
//Handler for mouse movement on field
function HandleMouseMove( event )
{
	//Safety catch for IE
	if( ! event )
		var event = window.event;
	
	//Focus the playing field
	field.focus( );
	
	//Move the player paddle
	var y = event.clientY - field.getBoundingClientRect( ).top;
	
	//Make sure we don't break out of the boundaries
	if( y - PaddleLength / 2 < PaddleYOffset )
		y = PaddleYOffset + PaddleLength / 2;
	else if( y + PaddleLength / 2 > FieldHeight - PaddleYOffset )
		y = FieldHeight - PaddleYOffset - PaddleLength / 2;
	
	//Move the paddle
	playerPaddleY = y - PaddleLength / 2;
}

//Handler for key presses/releases on field
function HandleKeys( event, status )
{
	//Safety catch for IE
	if( ! event )
		var event = window.event;
		
	//I don't feel like I should need this... alas.
	field.focus( );
	
	//Handle keys
	switch( event.keyCode )
	{
		case UpKey:
			upKeyPressed = status;
			break;
		case DownKey:
			downKeyPressed = status;
			break;
		case LaunchKey:
			TryLaunchBall( );
			break;
		case PauseKey:
			if( status )
				TryTogglePause( );
			break;
	}
}

//Attempts to toggle the game's pause state
function TryTogglePause( )
{
	//Pausing/unpausing only makes sense if we aren't awaiting launch
	if( ballXSpeed || ballYSpeed )
		gamePaused = ! gamePaused;
}

//Generates a random integer, x <= n < y
function Randrange( x, y )
{
	var r = x + Math.floor( Math.random( ) * ( y - x ) );
	return ( r > y - 1 ) ? y - 1 : r;	//Protect against rare rounding error
}

//AI for the CPU paddle - basically just follows the ball around
function ComputerPaddleAI( )
{
	//Returns a negative value for upward motion, and positive for downward
	var dif = ( ballY + BallSize / 2 ) - ( computerPaddleY + PaddleLength / 2 );
	return ( Math.abs( dif ) > AITolerance ) ? dif : 0;
}

//Warps the path of the ball
function WarpBall( paddleY, paddleDirection )
{
	//Here thar be dragons
	
	//We calculate the position of the middle of the ball along the paddle - if the middle isn't on the paddle, just pretend it's on the end
	var relative = ballY + BallSize / 2 - paddleY;
	if( relative < 0 )
		relative = 0;
	if( relative > PaddleLength - BallSize / 2 )
		relative = PaddleLength - BallSize / 2;
	
	//We use this relative position to calculate a transformation angle, ranging from - 45 degress to + 45 degrees
	var angle = - ( WarpRange / 2 ) + WarpRange * relative / ( PaddleLength - BallSize / 2 );
	
	//Apply the paddle movement warp factor
	if( paddleDirection )
		angle += ( paddleDirection < 0 ) ? - MotionWarp : MotionWarp;
	
	//Reverse the angle for a negative velocity
	if( ballXSpeed < 0 )
		angle = - angle;
	
	//We apply this rotation to the current speed
	var
		s = Math.sin( angle ),
		c = Math.cos( angle ),
		nx = ballXSpeed * c - ballYSpeed * s,
		ny = ballXSpeed * s + ballYSpeed * c;
	
	//Double-check that the transformation doesn't send the ball backward
	if( ( nx > 0 ) == ( ballXSpeed > 0 ) )
	{
		//Apply the transformation
		ballXSpeed = nx;
		ballYSpeed = ny;
	}
	
	//We give the ball a little horizontal speed boost with each hit
	ballXSpeed += ( ballXSpeed < 0 ) ? - BallHitBoost : BallHitBoost;
}

//Checks if a re-scale is needed, and scales if necessary
function TryScale( )
{
	//Grab container width/height (-2 for borders)
	var
		width = pongContainer.offsetWidth - 2,
		height = pongContainer.offsetHeight - 2;
	
	//If the dimensions have changed,
	if( ! ( width == lastWidth && height == lastHeight ) )
	{
		lastWidth = width;
		lastHeight = height;
		
		//Width:height ratio
		var ratio = width / height;
		
		//Scaling factor
		var scale;
		
		//If the ratio is larger than FieldRatio, the field size is limited by height
		if( ratio > FieldRatio )
			scale = height / FieldHeight;
		else	//Field size is limited by width
			scale = width / FieldWidth;
		
		//Scale everything up/down
		if( scale != 1 )
		{
			//Scale every constant and variable that matters
			ScaleConstants( scale );
			ScaleVariables( scale );
			
			//Reposition everything
			PositionField( );
			PositionPaddles( );
			PositionBall( );
			PositionLine( );
			
			//Render the ball and paddles with their new coordiantes
			RenderBall( );
			RenderPaddles( );
		}
	}
}

//Scales every pertinent constant up or down by a multiplier
function ScaleConstants( scale )
{
	FieldWidth		*= scale;
	FieldHeight		*= scale;
	
	BallSize		*= scale;
	BallXOrigin		*= scale;
	BallYOrigin		*= scale;
	BallLaunchSpeed	*= scale;
	BallHitBoost	*= scale;
	
	PaddleLength	*= scale;
	PaddleThickness	*= scale;
	PaddleStride	*= scale;
	PaddleYOrigin	*= scale;
	PaddleXOffset	*= scale;
	PaddleYOffset	*= scale;
	
	PlayerPaddleSurface	*= scale;
	ComputerPaddleSurface *= scale;
	
	AITolerance		*= scale;
}

//Scales every pertinent variable up or down by a multiplier
function ScaleVariables( scale )
{
	ballX	*= scale;
	ballY	*= scale;
	
	ballXSpeed	*= scale;
	ballYSpeed	*= scale;
	
	playerPaddleY	*= scale;
	computerPaddleY	*= scale;
}

//Position____ functions change the constant parameters of the various page elements,
//ie the size of the ball, the size and y coordinates of the paddles, etc.

//Sets the field size on-screen
function PositionField( )
{
	field.style.width = Pixels( FieldWidth );
	field.style.height = Pixels( FieldHeight );
}

//Sets the paddle sizes and x coordinates on-screen
function PositionPaddles( )
{
	playerPaddle.style.height = Pixels( PaddleLength );
	playerPaddle.style.width = Pixels( PaddleThickness );
	playerPaddle.style.left = Pixels( PaddleXOffset );
	
	computerPaddle.style.height = Pixels( PaddleLength );
	computerPaddle.style.width = Pixels( PaddleThickness );
	computerPaddle.style.right = Pixels( PaddleXOffset );
}

//Sets the line height and x coordinate on screen
function PositionLine( )
{
	line.style.height = Pixels( FieldHeight - 2 );
	line.style.left = Pixels( FieldWidth / 2 - 1 );
}

//Sets the ball size on screen
function PositionBall( )
{
	ball.style.width =
	ball.style.height = Pixels( BallSize );
}
